'use strict';

const http = require('http');
const url = require('url');
const httpDispatcher = require('httpdispatcher');
const yandexMoney = require('yandex-money-sdk');
const config = require('./config');

const saveTokenToDataBase = function (err, data) {
	// TODO: save data.access_token to database please and notify to bot
};

httpDispatcher.onGet('/', function (req, res) {
	const parsedUri = url.parse(req.url, true);
	const query = parsedUri.query;

	if (query && query.code) {
		yandexMoney.Wallet.getAccessToken(config.applicationId, query.code, config.redirectURI, config.applicationSecret,
				saveTokenToDataBase);
		res.writeHead(200, {'ContentType': 'text/plain'});
		res.end('landing completed');
	} else {
		res.writeHead(400, {'ContentType': 'text/plain'});
		res.end('Bad request beaches');
	}
});

const handleRequest = function (req, res) {
	httpDispatcher.dispatch(req, res);
};

const server = http.createServer(handleRequest);
server.listen('3000');

