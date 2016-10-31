var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

module.exports = [
  bodyParser.urlencoded({
    extended: false
  }),
  bodyParser.json(),
  cookieParser()
];
