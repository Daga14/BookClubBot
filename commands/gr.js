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
	// Fetch HTML of the page we want to scrape
		const { data } = await axios.get(link);
		// Load HTML we fetched in the previous line
		const $ = cheerio.load(data, { xmlMode: true });
		const bookCover = $('.BookCover__image').find($('.ResponsiveImage')).attr('src');
		const authorName = $('span[class="ContributorLink__name"]').first().text();
		const rating = $('.RatingStatistics__rating').first().text();
		const authorLink = $('.ContributorLink').attr('href');
		const pagesString = $('p[data-testid="pagesFormat"]').first().text();
		const pagesArray = pagesString.split(',');
		const pages = pagesArray[0];
		const publicationInfo = $('p[data-testid="publicationInfo"]').first().text();
		let description = $('.BookPageMetadataSection__description').find('span[class="Formatted"]').first().html();
		description = htmlToText(description, { wordwrap: false });
		let genres = 'Goodreads doesn\'t care enough for this book\'s genres.';
		let cont = 0;
		let firstGenre = '';
		$('.BookPageMetadataSection__genres').find('span[class="Button__labelItem"]').each(function() {
			const genreText = $(this).text();
			if (genreText) {
				if (cont == 0) {
					genres = '';
					cont += 1;
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
		const bookName = $('h1[class="Text Text__title1"]').text();
		const authorPhoto = $('.PageSection').find($('img[class="Avatar__image"]')).attr('src');
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
			console.log(link);
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
			await interaction.editReply('Good Job! Even Google can\'t find this book on goodreads');
		}
	},
};