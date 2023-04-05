const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const { htmlToText } = require('html-to-text');
const colors = require('../colors.json');

async function scrapeDataSG(link) {
	try {
		const { data } = await axios.get(link);
		const $ = cheerio.load(data, { xmlMode: true });

		// Book Name
		let bookName = 'You shouldn\'t see this';
		const tempBookName = $('h3[class="font-serif font-bold text-2xl md:w-11/12"]').first().contents().filter(function() {
			return this.type === 'text';
		}).text().trim();
		if (tempBookName != undefined && tempBookName != '') {
			bookName = tempBookName;
		}

		// Author Link
		let authorLink = '';
		const tempAuthorLink = $('.book-title-author-and-series').find($('a[class="hover:text-cyan-700 dark:hover:text-cyan-500"]')).attr('href');
		if (tempAuthorLink != undefined && tempAuthorLink != '') {
			authorLink = tempAuthorLink;
		}
		const authorLinkSG = 'https://app.thestorygraph.com' + authorLink;

		// Author Name
		let authorName = 'Author Name';
		const tempAuthorName = $('.book-title-author-and-series').find($('a[class="hover:text-cyan-700 dark:hover:text-cyan-500"]')).first().text();
		if (tempAuthorName != undefined && tempAuthorName != '') {
			authorName = tempAuthorName;
		}

		// Book Image
		const bookImg = $('img[class="rounded-sm shadow-lg dark:shadow-darkerGrey/40 inline"]').first().attr('src');

		// Description
		let description = 'This book doesn\'t have a description';
		let descSG = $('div[class="px-2"]').first().text();
		descSG = descSG.split('$(this).parent().parent().html(\'').pop();
		descSG = htmlToText(descSG, { wordwrap: false });
		// a crappy hack - to do: better parsing
		descSG = descSG.slice(11, -4);
		if (descSG != undefined && descSG != '') {
			description = descSG;
		}

		// Publication Info
		let publicationInfo = 'Never published';
		const tempPublicationInfo = $('span[class="toggle-edition-info-link underline decoration-darkerGrey dark:decoration-lightGrey cursor-pointer hover:text-cyan-700 dark:hover:text-cyan-500 hover:decoration-cyan-700 dark:hover:decoration-cyan-500"]').first().text();
		if (tempPublicationInfo != undefined && tempPublicationInfo != '') {
			publicationInfo = tempPublicationInfo;
		}

		// Rating
		let rating = '0.0';
		const tempRating = $('.average-star-rating').first().text();
		if (tempRating != undefined && tempRating != '') {
			rating = tempRating;
		}

		// Pages
		let pages = 'No pages found';
		const bookPages = $('p[class="text-xs min-[520px]:text-sm font-light text-darkestGrey dark:text-grey mt-1"]').first().contents().filter(function() {
			return this.type === 'text';
		}).text().trim();
		if (bookPages != undefined && bookPages != '') {
			pages = htmlToText(bookPages, { wordwrap: false }).slice(0, -2);
		}

		// Genres
		let genres = 'StoryGraph doesn\'t care enough for this book\'s genres.';
		let secondGenreFlag = false;
		let genreColor = '';
		let firstGenreFlag = true;

		$('.book-page-tag-section').first().find('span[class="inline-block text-xs sm:text-sm text-teal-700 dark:text-teal-200 mr-0.5 mt-1 border border-darkGrey dark:border-darkerGrey rounded-sm py-0.5 px-2"]').each(function() {
			const genreText = $(this).text();
			if (genreText) {
				if (firstGenreFlag) {
					genres = '';
					firstGenreFlag = false;
				}
				if (genres == '') {
					genres += genreText;
				}
				else if (genreText != '...more') {
					if (!secondGenreFlag) {
						genreColor = genreText;
						secondGenreFlag = true;
					}
					genres += ', ' + genreText;
				}
			}
		});

		// Color
		let color = colors[genreColor.toLowerCase()];
		if (color == undefined) {
			color = 0xF44336;
		}

		// Content Warning
		let contentWarning = '';
		const triggerW = $('div[class="hidden content-warnings-information mt-4"]').first().text();
		const contentW = triggerW.split('\n');
		for (const i in contentW) {
			const nLine = contentW[i].trim();
			if (nLine != '') {
				if (nLine == 'Graphic' || nLine == 'Moderate' || nLine == 'Minor') {
					contentWarning += nLine + ': ';
				}
				else {
					contentWarning += '(' + nLine + ') ';
				}
			}

		}

		if (contentWarning != '') {
			contentWarning = '||' + contentWarning + '||';
		}
		else {
			contentWarning = 'No warnings';
		}

		// Creating Embed
		const exampleEmbed = new EmbedBuilder()
			.setColor(color)
			.setTitle(bookName)
			.setURL(link)
			.setAuthor({ name: authorName, url: authorLinkSG })
			.setDescription(description)
			.setFooter({ text: publicationInfo })
			.setThumbnail(bookImg);
		exampleEmbed.addFields({ name: '⭐ Avg. Rating', value: rating, inline:true });
		exampleEmbed.addFields({ name: '📄 Pages', value: pages, inline:true });
		exampleEmbed.addFields({ name: '➡️ Genres', value: genres });
		exampleEmbed.addFields({ name: '❗ Content Warnings', value: contentWarning });

		return exampleEmbed;
	}
	catch (err) {
		console.error(err);
	}
}

async function bookListSG(bookName) {
	try {
		const addPercentage = bookName;
		const linkSG = 'https://app.thestorygraph.com/browse?search_term=' + addPercentage;
		const { data } = await axios.get(linkSG);
		const $ = cheerio.load(data, { xmlMode: true });
		let buildLink = '';
		const bookLink = $('.book-title-author-and-series').find($('a')).first().attr('href');
		if (bookLink != undefined && bookLink != '') {
			buildLink = 'https://app.thestorygraph.com' + bookLink;
		}
		return buildLink;

	}
	catch (err) {
		console.error(err);
	}
}


module.exports = {
	data: new SlashCommandBuilder()
		.setName('sg')
		.setDescription('Searches book on SG')
		.addStringOption(option =>
			option.setName('book_name')
				.setRequired(true)
				.setDescription('Name of the book to search')),
	async execute(interaction) {
		await interaction.deferReply();
		const q = interaction.options.getString('book_name');

		const bookLink = await bookListSG(q);

		if (bookLink != '' && bookLink != undefined) {
			const embedBook = await scrapeDataSG(bookLink);
			await interaction.editReply({ embeds: [embedBook] });
		}
		else {
			await interaction.editReply('I don\'t understand that reference');
		}
	},
};