'use strict';

var http = require('http');
var url = require('url');
var httpDispatcher = require('httpdispatcher');
var yandexMoney = require('yandex-money-sdk');
var config = require('./config');
var Bot = require('./Bot');
var p2p = require('./p2p');
var phone = require('./phone');
var aes = require('./aes-crypt');


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
			return;
		}


		var userId = query.userId;
		var accessToken = data['access_token'];

		p2pTokens
			.insert({
				userId: +userId,
				accessToken: aes.encrypt(userId, accessToken),
				created: Math.floor(Date.now() / 1000)
			})
			.then(function(result) {
				console.log(result.insertedIds);
			})
			.catch(function(err) {
				console.log(err);
			});

		var operation = query.operation;

		if (operation === 'p2p') {
			bot.sendMessage(query.chatId, 'Ура! Все получилось. Я могу перевести деньги на счёт в '
				+ 'Яндекс.Деньгах, на адрес электронной почты или телефон. Кстати, получатель '
				+ 'перевода может даже не знать про Яндекс.Деньги, просто введите его адрес '
				+ 'электронной почты или номер телефона!');
			p2p({
				bot: bot,
				chatId: query.chatId,
				accessToken: accessToken,
				holdForPickup: query.holdForPickup || false
			}, function (err, data) {
				console.log('-----------------requestComplete-----------------');
				console.log(err);
				console.log(data);
				if (err) {
					bot.sendMessage(query.chatId, 'Что-то пошло не так. Мне не удалось отправить перевод, попробуем снова: /send ?');
					return;
				}
				bot.sendMessage(query.chatId, 'Ваши деньги успешно отправлены получателю, '
						+ 'был рад помочь!');
			});
		} else {
			bot.sendMessage(query.chatId, 'Ура! Все получилось!');
			phone({
				bot: bot,
				chatId: query.chatId,
				accessToken: accessToken
			}, function (err, data) {
				console.log('-----------------requestComplete-----------------');
				console.log(err);
				console.log(data);
				if (err) {
					bot.sendMessage(query.chatId, 'Видимо мы что то напутали, так как мне не удалось пополнить счет сотового телефона, попробуем снова: /phone');
					return;
				}
				bot.sendMessage(query.chatId, 'Я успешно пополнил счет телефона!');
			});
		}

	};

	if (query && query.code) {
		console.log(query);
		yandexMoney.Wallet.getAccessToken(config.applicationId, query.code, config.redirectURI, config.applicationSecret,
				saveTokenToDataBase);
		res.writeHead(301, {
			'Location': '/success.html'
		});
		res.end();
	} else if (query.extenal) {
		res.writeHead(301, {
			'Location': '/externalSuccess.html'
		});
		res.end();
	} else {
		res.writeHead(301, {
			'Location': '/error.html'
		});
		res.end();
	}
});

var handleRequest = function (req, res) {
	httpDispatcher.dispatch(req, res);
};

var server = http.createServer(handleRequest);
server.listen('3000');
