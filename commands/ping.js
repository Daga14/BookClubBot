const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder } = require('discord.js');
const { htmlToText } = require('html-to-text');

const config = {
	headers: {
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
		'Accept-Encoding': 'gzip, deflate, br',
		'Accept-Language': 'en-US,en;q=0.9,es-AR;q=0.8,es;q=0.7',
		'Sec-Ch-Ua': '"Opera GX";v="93", "Not/A)Brand";v="8", "Chromium";v="107"',
		'Sec-Ch-Ua-Mobile': '?0',
		'Sec-Ch-Ua-Platform': '"Windows"',
		'Sec-Fetch-Dest': 'document',
		'Sec-Fetch-Mode': 'navigate',
		'Sec-Fetch-Site': 'cross-site',
		'Sec-Fetch-User': '?1',
		'Upgrade-Insecure-Requests': '1',
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0',
		'X-Amzn-Trace-Id': 'Root=1-63d99a57-4708a7257aa929e008a1b055',
	},
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		try {
			// Fetch HTML of the page we want to scrape
			await axios.get('https://www.goodreads.com/book/show/783505.Embers', config)
				.then(({ data }) => {
					// Load HTML we fetched in the previous line
					console.log(data);
					const $ = cheerio.load(data, { xmlMode: true });
					const bookCover = $('.BookCover__image').find($('.ResponsiveImage')).attr('src');
					console.log(bookCover);
					const authorName = $('span[class="ContributorLink__name"]').first().text();
					console.log(authorName);
					const rating = $('.RatingStatistics__rating').first().text();
					console.log(rating);
					const authorLink = $('.ContributorLink').attr('href');
					console.log(authorLink);
					const pagesString = $('p[data-testid="pagesFormat"]').first().text();
					console.log(pagesString);
					const pagesArray = pagesString.split(',');
					const pages = pagesArray[0];
					const publicationInfo = $('p[data-testid="publicationInfo"]').first().text();
					let description = $('.BookPageMetadataSection__description').find('span[class="Formatted"]').first().html();
					description = htmlToText(description, { wordwrap: false });
					let genres = 'Goodreads doesn\'t care enough for this book\'s genres.';
					let cont = 0;
					// eslint-disable-next-line no-unused-vars
					$('.BookPageMetadataSection__genres').find('span[class="Button__labelItem"]').each(function(i, elm) {
						const genreText = $(this).text();
						if (genreText) {
							if (cont == 0) {
								genres = '';
								cont += 1;
							}
							if (genres == '') {
								genres += genreText;
							}
							else if (genreText != '...more') {
								genres += ', ' + genreText;
							}
						}
					});
					const color = 0xf34733;
					const bookName = $('h1[class="Text Text__title1"]').text();
					console.log(bookName);
					const authorPhoto = $('.PageSection').find($('img[class="Avatar__image"]')).attr('src');
					console.log(authorPhoto);
					const exampleEmbed = new EmbedBuilder()
						.setColor(color)
						.setTitle(bookName)
						.setURL('https://www.goodreads.com/book/show/783505.Embers')
						.setAuthor({ name: authorName, iconURL: authorPhoto, url: authorLink })
						.setDescription(description)
						.setFooter({ text: publicationInfo })
						.setThumbnail(bookCover);
					exampleEmbed.addFields({ name: '⭐ Avg. Rating', value: rating, inline:true });
					exampleEmbed.addFields({ name: '📄 Pages', value: pages, inline:true });
					exampleEmbed.addFields({ name: '➡️ Genres', value: genres });
					console.log(exampleEmbed);
				});
		}
		catch (err) {
			console.error(err);
		}

		await interaction.reply('Pong!');
	},
};