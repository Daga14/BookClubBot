const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');
const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder } = require('discord.js');
const { htmlToText } = require('html-to-text');
const { apiKey, cseKey } = require('../config.json');
const colors = require('../colors.json');

async function scrapeData(link) {
	try {
		const { data } = await axios.get(link);
		const $ = cheerio.load(data, { xmlMode: true });
		const bookCover = $('.BookCover__image').find($('.ResponsiveImage')).attr('src');

		let authorName = 'Author Name';
		const contributorName = $('span[class="ContributorLink__name"]').first().text();
		if (contributorName != undefined && contributorName != '') {
			authorName = contributorName;
		}

		let rating = '0.0';
		const ratingStatistics = $('.RatingStatistics__rating').first().text();
		if (ratingStatistics != undefined && ratingStatistics != '') {
			rating = ratingStatistics;
		}

		let authorLink = 'Author Link';
		const contributorLink = $('.ContributorLink').attr('href');
		if (contributorLink != undefined && contributorLink != '') {
			authorLink = contributorLink;
		}

		let pagesString = '0 pages, Empty';
		const pagesFormat = $('p[data-testid="pagesFormat"]').first().text();
		if (pagesFormat != undefined && pagesFormat != '') {
			pagesString = pagesFormat;
		}
		const pagesArray = pagesString.split(',');
		const pages = pagesArray[0];

		let publicationInfo = 'Never published';
		const publicationHtml = $('p[data-testid="publicationInfo"]').first().text();
		if (publicationHtml != undefined && publicationHtml != '') {
			publicationInfo = publicationHtml;
		}

		let description = 'This is a generic description';
		let metadataSectionDescription = $('.BookPageMetadataSection__description').find('span[class="Formatted"]').first().html();
		metadataSectionDescription = htmlToText(metadataSectionDescription, { wordwrap: false });
		if (metadataSectionDescription != undefined && metadataSectionDescription != '') {
			description = metadataSectionDescription;
		}

		let genres = 'Goodreads doesn\'t care enough for this book\'s genres.';
		let firstGenreFlag = true;
		let firstGenre = '';
		$('.BookPageMetadataSection__genres').find('span[class="Button__labelItem"]').each(function() {
			const genreText = $(this).text();
			if (genreText) {
				if (firstGenreFlag) {
					genres = '';
					firstGenreFlag = false;
					firstGenre = genreText;
				}
				if (genres == '') {
					genres += genreText;
				}
				else if (genreText != '...more') {
					genres += ', ' + genreText;
				}
			}
		});
		let color = colors[firstGenre];
		if (color == undefined) {
			color = 0xF44336;
		}
		let bookName = 'Book Name';
		const textTitle1 = $('h1[class="Text Text__title1"]').text();
		if (textTitle1 != undefined && textTitle1 != '') {
			bookName = textTitle1;
		}
		let authorPhoto = 'http://false.com';
		const avatarImage = $('.PageSection').find($('img[class="Avatar__image"]')).attr('src');
		if (avatarImage != undefined && avatarImage != '') {
			authorPhoto = avatarImage;
		}
		const exampleEmbed = new EmbedBuilder()
			.setColor(color)
			.setTitle(bookName)
			.setURL(link)
			.setAuthor({ name: authorName, iconURL: authorPhoto, url: authorLink })
			.setDescription(description)
			.setFooter({ text: publicationInfo })
			.setThumbnail(bookCover);
		exampleEmbed.addFields({ name: '⭐ Avg. Rating', value: rating, inline:true });
		exampleEmbed.addFields({ name: '📄 Pages', value: pages, inline:true });
		exampleEmbed.addFields({ name: '➡️ Genres', value: genres });

		return exampleEmbed;
	}
	catch (err) {
		console.error(err);
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gr')
		.setDescription('Searches book on GR')
		.addStringOption(option =>
			option.setName('book_name')
				.setRequired(true)
				.setDescription('Name of the book to search')),
	async execute(interaction) {
		await interaction.deferReply();
		const customsearch = google.customsearch('v1');
		const q = interaction.options.getString('book_name');
		const res = await customsearch.cse.list({
			cx: cseKey,
			q: q,
			auth: apiKey,
			num: 10,
		});
		if (res.status == 400 || res.status == 500 || res.status == 404) {
			await interaction.reply('There was a mistake');
		}
		const items = res.data.items;
		let bookLink = '';
		for (let i = 0; i < items.length; i++) {
			const link = items[i].link;
			if (link.includes('https://www.goodreads.com/book/show/')) {
				i = items.length;
				bookLink = link;
			}
		}

		if (bookLink != '') {
			let embedBook = await scrapeData(bookLink);
			if (embedBook == undefined) {
				embedBook = await scrapeData(bookLink);
			}
			if (embedBook != undefined) {
				await interaction.editReply({ embeds: [embedBook] });
			}
			else {
				await interaction.editReply('Amazon blocked this request :(');
			}
		}
		else {
			await interaction.editReply('I don\'t understand that reference');
		}
	},
};