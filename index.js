'use strict';

var http = require('http');
var url = require('url');
var httpDispatcher = require('httpdispatcher');
var yandexMoney = require('yandex-money-sdk');
var config = require('./config');
var Bot = require('./Bot');


var dbName = 'easyway';

var db = require('mongodb-promises').db('localhost:27017', dbName);
var p2pTokens = db.collection('p2p_tokens');
var externalTokens = db.collection('external_tokens');

// Setup polling way
var bot = Bot();

httpDispatcher.onGet('/', function (req, res) {
	var parsedUri = url.parse(req.url, true);
	var query = parsedUri.query;

	var saveTokenToDataBase = function (err, data) {
		console.log('-----------------saveTokenToDataBase-----------------');
		console.log(data.status);
		console.log(data);
		if (data.error) {
			bot.sendMessage(query.chatId, data.error);
		} else {
			bot.sendMessage(query.chatId, 'Всё ок');
		}
		// var accessToken = data['access_token'];
		// save it to DB, config, etc..
		// TODO: save data.access_token to database please and notify to bot
	};

	if (query && query.code) {
		console.log(query)
		yandexMoney.Wallet.getAccessToken(config.applicationId, query.code, config.redirectURI, config.applicationSecret,
				saveTokenToDataBase);
		res.writeHead(200, {'ContentType': 'text/plain'});
		res.end('landing completed');
	} else {
		res.writeHead(400, {'ContentType': 'text/plain'});
		res.end('Bad request beaches');
	}
});

var handleRequest = function (req, res) {
	httpDispatcher.dispatch(req, res);
};

var server = http.createServer(handleRequest);
server.listen('3000');
