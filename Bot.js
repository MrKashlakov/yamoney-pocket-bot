var TelegramBot = require('node-telegram-bot-api');
var yandexMoney = require("yandex-money-sdk");
var config = require('./config');
var Wallet = yandexMoney.Wallet;
var ExternalPayment = yandexMoney.ExternalPayment;
var p2p = require('./p2p');
var phone = require('./phone');

var dbName = 'easyway';
var db = require('mongodb-promises').db('localhost:27017', dbName);
var p2pTokens = db.collection('p2p_tokens');
var externalTokens = db.collection('external_tokens');


// Опции для ожидания ответа
var forceReplyOpts = {
	'reply_markup': JSON.stringify({
		'force_reply': true
	})
};

function runBot() {
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

		if (msg.sticker) {
			switch (msg.sticker['file_id']) {
				case 'BQADAgADNAADJ8sDAAHyUy3r2FUZFwI': {
					phoneHandler(msg);
					break;
				}
				case 'BQADAgADMAADJ8sDAAFmSLfHZ124IwI': {
					p2pHandler(msg);
					break;
				}
				case 'BQADAgADMgADJ8sDAAGF8UjLWkYJcgI': {
					refillHandler(msg);
					break;
				}
			}
		}
	});

	bot.onText(/\/?start$/i, function(msg) {
		var chatId = msg.chat.id;
		var opts = {
			'reply_to_message_id': msg['message_id'],
			'reply_markup': JSON.stringify({
				keyboard: [
					['Пополнить сотовый'],
					['Пополнить счет'],
					['Перевести деньги']
				],
				'one_time_keyboard': true
			}),
			'parse_mode': 'Markdown'
		};

		var urlStickers = 'https://telegram.me/addstickers/EasyWayBot';
		bot.sendMessage(chatId, 'Добрый день! Я бот карманный финансовый помощник.\n'
				+ 'Я помогу вам сэкономить время на небольших, но частых финансовых операциях.\n'
				+ 'Я умею переводить деньги вашим друзьям.\n'
				+ 'Я умею пополнять ваш счет в Яндекс.Деньги.\n'
				+ 'Я смогу пополнить ваш сотовый, а ещё я всегда у вас под рукой!\n'
				+ 'Со мной можно общаться [стикерами](' + urlStickers + ')', opts);
	});


	bot.onText(/\/cats/, function (msg) {
		var chatId = msg.chat.id;
		var opts = {
			'reply_to_message_id': msg['message_id'],
			'reply_markup': JSON.stringify({
				keyboard: [
					['Cat #1', 'Cat #2', 'Cat #3']
				],
			'one_time_keyboard': true
			})
		};
		bot.sendMessage(chatId, 'Choose your cat?', opts);
	});

	bot.onText(/\/?help$/i, function(msg) {
		var chatId = msg.chat.id;
		bot.sendMessage(chatId, '/start - информация обо мне\n'
			+ '/help - справка\n'
			+ '/phone - пополнение счёта мобильного телефона.\n'
			+ '/refill - пополнение своего счёта в системе '
			+ 'Яндекс.Деньги с любой карты.\n'
			+ '/send - перевод на номер счёта в Яндекс.Деньги по номеру телефона или '
			+ 'адресу электронной почты, даже если получатель перевода не зарегистрирован '
			+ 'в системе Яндекс.Деньги.\n\n'
			+ 'Все платёжные операции выполняются через сайт '
			+ '[Яндекс.Деньги](' + 'https://money.yandex.ru/' + ')'
			+ '. Бот никогда не попросит ввести данные вашей банковской карты, все данные '
			+ 'карты обрабатываются на сайте Яндекс.Деньги. Остерегайтесь мошенников.', {
				'parse_mode': 'Markdown'
			}
		);
	});

	function phoneHandler(msg) {
		var chatId = msg.chat.id;
		var userId = msg.from.id;

		p2pTokens.findOne({
			userId: +userId
		}, function(err, item) {
			item.toArray().then(function(array) {
				if (array.length) {
					var accessToken = array[0].accessToken;
					console.log('-----accessToken found--------');
					console.log(array);

					var options = {
						bot: bot,
						chatId: chatId,
						accessToken: accessToken
					};
					phone(options, function (err, data) {
						console.log('-----------------requestComplete-----------------');
						console.log(err);
						console.log(data);
						if (err) {
							bot.sendMessage(chatId, 'Видимо мы что то напутали, так как мне не удалось пополнить счет сотового телефона, попробуем снова: /phone');
							return;
						}
						bot.sendMessage(chatId, 'Я успешно пополнил счет телефона!');
					});
				} else {
					console.log('-----accessToken not found--------');
					var scope = ['account-info', 'operation-history', 'payment-p2p', 'payment-shop'];
					var url = Wallet.buildObtainTokenUrl(config.applicationId,
						config.redirectURI  + '?chatId=' + chatId + '&userId=' + userId + '&operation=phone',
						scope);
					bot.sendMessage(chatId, 'Чтобы выполнить перевод со счёта в Яндекс.Деньги, потребуется привязать '
							+ 'меня к вашему счету. Для этого перейдите по [ссылке](' + url + ').', {
						'parse_mode': 'Markdown'
					});
				}
			});
		});
	}

	bot.onText(/\/?phone$/i, phoneHandler);
	bot.onText(/\/?Пополнить сотовый$/i, phoneHandler);

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

	function p2pHandler(msg) {
		var chatId = msg.chat.id;
		var userId = msg.from.id;

		p2pTokens.findOne({
			userId: +userId
		}, function(err, item) {
			item.toArray().then(function(array) {
				if (array.length) {
					var accessToken = array[0].accessToken;
					console.log('-----accessToken found--------');
					console.log(array);

					var options = {
						bot: bot,
						chatId: chatId,
						accessToken: accessToken,
						holdForPickup: false,
						twice: true
					};

					p2p(options, function (err, data) {
						console.log('-----------------requestComplete-----------------');
						console.log(err);
						console.log(data);
						if (err) {
							bot.sendMessage(chatId, 'Что-то пошло не так. Мне не удалось отправить перевод, попробуем снова: /send ?');
							// process error
						} else {
							bot.sendMessage(chatId, 'Ваши деньги успешно отправлены получателю, был рад помочь!');
						}
					});
				} else {
					console.log('-----accessToken not found--------');
					var scope = ['account-info', 'operation-history', 'payment-p2p'];
					var url = Wallet.buildObtainTokenUrl(config.applicationId,
						config.redirectURI  + '?chatId=' + chatId + '&userId=' + userId + '&operation=p2p',
						scope);
					bot.sendMessage(chatId, 'Чтобы выполнить перевод со счёта в Яндекс.Деньги, потребуется привязать '
							+ 'меня к вашему счету. Для этого перейдите по [ссылке](' + url + ').', {
						'parse_mode': 'Markdown'
					});
				}
			});
		});
	}

	bot.onText(/send$/, p2pHandler);
	bot.onText(/Перевести деньги$/i, p2pHandler);

	bot.onText(/refill$/, refillHandler);
	bot.onText(/Пополнить счет$/i, refillHandler);
	bot.onText(/Пополнить$/i, refillHandler);
	bot.onText(/закинуть$/i, refillHandler);

	return bot;

	function refillHandler(msg) {
		var chatId = msg.chat.id;
		var userId = msg.from.id;
		bot.sendMessage(chatId, 'Я умею пополнять любой счет в Яндекс.Деньгах с вашей карты. '
					+ 'Хочу напомнить, что вводить данные карты вам придется на сайте Яндекс.Денег, '
					+ 'если это не так - я не настоящий! Пожалуйста введите номер счета, который мы '
					+ 'должны пополнить, а через пробел сумму пополнения', forceReplyOpts)
		.then(function (sended) {
			var chatId = sended.chat.id;
			var messageId = sended['message_id'];
			bot.onReplyToMessage(chatId, messageId, function (msg) {
				msg = msg.text.split(' ');
				var accountNumber = msg[0];
				var sum = msg[1];

				if (sum) {
					startAccountRefill(accountNumber, sum, chatId, userId);
				} else {
					bot.sendMessage(chatId, 'Теперь введите сумму, пожалуйста', forceReplyOpts)
					.then(function (sended) {
							var chatId = sended.chat.id;
							var messageId = sended['message_id'];
							bot.onReplyToMessage(chatId, messageId, function (sum) {
								sum = sum.text;
								startAccountRefill(accountNumber, sum, chatId, userId);
							});
						});
				}
			});
		});
	}

	function startAccountRefill(accountNumber, sum, chatId, userId) {
		var instanceId;

		externalTokens.findOne({
			userId: +userId
		}, function(err, item) {
			item.toArray().then(function(array) {
				if (array.length) {
					instanceId = array[0].instanceId;
					console.log('-----userToken found--------');
					console.log(array);
					reffilAccount(instanceId, accountNumber, sum, chatId);
				} else {
					console.log('-----userToken not found--------');
					// getInstanceId
					ExternalPayment.getInstanceId(config.applicationId, function(error, data, response) {
						console.log('-----------------getInstanceId-----------------');
						console.log(response.statusCode);
						console.log(data.status);
						console.log(data);

						if (data.status === 'success') {
							instanceId = data['instance_id'];
							externalTokens
								.insert({
									userId: +userId,
									instanceId: instanceId,
									created: Math.floor(Date.now() / 1000)
								})
								.then(function(result) {
									console.log(result.insertedIds);
								})
								.catch(function(err) {
									console.log(err);
								});
							reffilAccount(instanceId, accountNumber, sum, chatId);
						}
					});
				}
			});
		});

	}

	function reffilAccount(instanceId, accountNumber, sum, chatId) {
		var requestOptions = {
			"pattern_id": "p2p",
			"to": accountNumber,
			"amount_due": sum,
			"label": "testPayment"
		};
		var api = new ExternalPayment(instanceId);

		api.request(requestOptions, function (error, data, response) {
			console.log('-----------------requestComplete-----------------');
			console.log(response.statusCode);
			console.log(data.status);
			console.log(data);
			var requestId = data['request_id'];

			api.process({
				"request_id": requestId,
				'ext_auth_success_uri': config.redirectURI,
				'ext_auth_fail_uri': config.redirectURI
			}, function (err, data) {
				console.log('-----------------process-----------------');
				console.log(data);
				if (err) {
					bot.sendMessage(chatId, 'Видимо мы что то напутали, так как мне '
							+ 'не удалось пополнить счет, попробуем снова: /refill ?');
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
					bot.sendMessage(chatId, 'А вот и [ссылка для ввода карты](' + url + ')', {
						'parse_mode': 'Markdown'
					});
				} else {
					bot.sendMessage(chatId, 'Видимо мы что то напутали, так как мне '
							+ 'не удалось пополнить счет, попробуем снова: /refill ?');
				}
			});
		});
	}

}


module.exports = runBot;
