var TelegramBot = require('node-telegram-bot-api');
var yandexMoney = require("yandex-money-sdk");
var config = require('./config');
var Wallet = yandexMoney.Wallet;
var ExternalPayment = yandexMoney.ExternalPayment;

// Опции для ожидания ответа
var forceReplyOpts = {
	'reply_markup': JSON.stringify({
		'force_reply': true
	})
};

// Setup polling way
var bot = new TelegramBot(config.token, {polling: true});

// Matches /echo [whatever]
bot.onText(/\/echo (.+)/, function (msg, match) {
	var fromId = msg.chat.id;
	var resp = match[1];
	bot.sendMessage(fromId, resp);
});

// Отладочная информация
bot.on('message', function (msg) {
	console.log(msg);
});

bot.onText(/\/?start$/i, function(msg) {
	var chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Приветствие');
});

bot.onText(/\/?help$/i, function(msg) {
	var chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Помощь');
});

bot.onText(/\/?settings$/i, function(msg) {
	var chatId = msg.chat.id;
	bot.sendMessage(chatId, 'Какие-нибудь настройки');
});

bot.onText(/\/cat/, function (msg) {
	var chatId = msg.chat.id;
	var opts = {
		'reply_to_message_id': msg['message_id'],
		'reply_markup': JSON.stringify({
			keyboard: [
				['Cat #1', 'Cat #2'],
				['Cat #3', 'external', 'Wallet']
			],
		'one_time_keyboard': true
		})
	};
	bot.sendMessage(chatId, 'Choose your cat?', opts);
});


bot.onText(/Cat #1/,function (msg) {
	var chatId = msg.chat.id;
	var photo = 'cat1.jpg';
	bot.sendPhoto(chatId, photo, {caption: 'Snow cat'});
});

bot.onText(/Cat #2/,function (msg) {
	var chatId = msg.chat.id;
	var photo = 'cat2.jpg';
	bot.sendPhoto(chatId, photo, {caption: 'Grumpy cat'});
});

bot.onText(/Cat #3/,function (msg) {
	var chatId = msg.chat.id;
	bot.sendSticker(chatId, 'BQADAgADZgEAAvR7GQABEYHZ8mAQ8ncC');
});


bot.onText(/Wallet/,function (msg) {
	var chatId = msg.chat.id;
	var scope = ['account-info', 'operation-history'];
	var url = Wallet.buildObtainTokenUrl(config.applicationId, config.redirectURI, scope);
	bot.sendMessage(chatId, 'Чуваааак, авторизуйся у меня [Я ссылко, жмякни на меня](' + url + ')', {
		'parse_mode': 'Markdown'
	});

	// Меняем на постоянный токен
	// Wallet.getAccessToken(config.applicationId, 'code', config.redirectURI, scope, function(err, data) {
	//  console.log('------------------getAccessToken---------------');
	//  console.log(response.statusCode);
	//  console.log(data.status);
	//  console.log(data);
	//  if(err) {
	//    // process error
	//  }
	//  var accessToken = data['access_token'];
	//  // save it to DB, config, etc..
	// });
});

bot.onText(/external/,function (msg) {
	var chatId = msg.chat.id;

	bot.sendMessage(chatId, 'Вы выбрали опцию пополнения кошелька. '
			+ 'Пожалуйста, введите номер кошелька, который хотите пополнить', forceReplyOpts)
	.then(function (sended) {
		var chatId = sended.chat.id;
		var messageId = sended['message_id'];
		bot.onReplyToMessage(chatId, messageId, function (accountNumber) {
			accountNumber = accountNumber.text;
			// TODO проверки всякие для accountNumber и если всё ок, то запрашиваем сумму
			bot.sendMessage(chatId, 'Вы хотите пополнить кошелек ' + accountNumber
					+ '. Теперь введите сумму, пожалуйста', forceReplyOpts)
			.then(function (sended) {
					var chatId = sended.chat.id;
					var messageId = sended['message_id'];
					bot.onReplyToMessage(chatId, messageId, function (sum) {
						sum = sum.text;
						// TODO проверки всякие для accountNumber и если всё ок, то запрашиваем сумму
						bot.sendMessage(chatId, 'Итак, вы хотите пополнить аккаунт на сумму '
							+ sum + '. Начинаем формировать ссылку на пополнение ;)');

						startAccountRefill(accountNumber, sum, chatId);
					});
				});
		});
	});
});

function startAccountRefill(accountNumber, sum, chatId) {
	var requestId = null;
	var instanceId = null;

	// getInstanceId
	ExternalPayment.getInstanceId(config.applicationId, function(error, data, response) {
		console.log('-----------------getInstanceId-----------------');
		console.log(response.statusCode);
		console.log(data.status);
		console.log(data);

		if (data.status === 'success') {
			instanceId = data['instance_id'];

			var requestOptions = {
				"pattern_id": "p2p",
				// "to": "410013269422933",
				"to": accountNumber,
				"amount_due": sum,
				"comment": "test payment comment from yandex-money-nodejs",
				"message": "test payment message from yandex-money-nodejs",
				"label": "testPayment"
				// ,
				// "test_payment": true,
				// "test_result": "success"
			};
			var api = new ExternalPayment(instanceId);

			api.request(requestOptions, function (error, data, response) {
				console.log('-----------------requestComplete-----------------');
				console.log(response.statusCode);
				console.log(data.status);
				console.log(data);
				requestId = data['request_id'];

				api.process({
					"request_id": requestId,
					'ext_auth_success_uri': config.redirectURI,
					'ext_auth_fail_uri': config.redirectURI
				}, function (err, data) {
					console.log('-----------------process-----------------');
					console.log(data);
					if (err) {
						console.log('err');
					// process error
					}
					// process data
					if (data.status === 'ext_auth_required') {
						var params = [];
						var acsParams = data['acs_params'];

						for (var prop in acsParams) {
							if (acsParams.hasOwnProperty(prop)) {
								params.push(prop + '=' + acsParams[prop]);
							}
						}

						var url = data['acs_uri'];

						if (params.length) {
							url += '?' + params.join('&');
						}
						bot.sendMessage(chatId, 'Если вы готовы пополнить мне счет, перейдите, пожалуйста по ссылке ' + url);
					} else {
						bot.sendMessage(chatId, 'Что-то пошло не так. Возможно, вы неправильно '
								+ 'указали номер счёта для пополнения. Попробуйте начать заново.');
					}
				});
			});
		}
	});
}
