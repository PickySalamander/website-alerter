const {join} = require('path');

module.exports = {
	// set the directory for the puppeteer cache to somewhere we have permission to write
	cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
}