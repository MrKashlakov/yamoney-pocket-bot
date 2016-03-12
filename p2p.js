var yandexMoney = require('yandex-money-sdk');
var Wallet = yandexMoney.Wallet;

// Опции для ожидания ответа
var forceReplyOpts = {
	'reply_markup': JSON.stringify({
		'force_reply': true
	})
};

/**
 * @param {Object} options
 * @param {Object} options.bot
 * @param {String} options.chatId
 * @param {String} options.accessToken
 * @param {String} options.holdForPickup
 * @param {Function} processComplete callback
 */
function p2pHandler(options, processComplete) {
	var chatId = options.chatId;
	var accessToken = options.accessToken;
	var bot = options.bot;
	var holdForPickup = options.holdForPickup;
	bot.sendMessage(chatId, 'Вы выбрали опцию p2p. '
			+ 'Пожалуйста, введите номер кошелька или кому вы там хотите перевести', forceReplyOpts)
	.then(function (sended) {
		var chatId = sended.chat.id;
		var messageId = sended['message_id'];
		bot.onReplyToMessage(chatId, messageId, function (msg) {
			msg = msg.text;
			var to = msg;
			bot.sendMessage(chatId, 'Итак вы хотите перевести рублики на ' + msg
					+ '. Теперь введите сумму, пожалуйста', forceReplyOpts)
			.then(function (sended) {
					var chatId = sended.chat.id;
					var messageId = sended['message_id'];
					bot.onReplyToMessage(chatId, messageId, function (sum) {
						sum = sum.text;
						bot.sendMessage(chatId, 'Итак, вы хотите перевести '
							+ sum + '. Начинаем, блеать!');

						startP2P({
							bot: bot,
							to: to,
							sum: sum,
							chatId: chatId,
							accessToken: accessToken,
							holdForPickup: holdForPickup
						}, processComplete);
					});
				});
		});
	});
}

/**
 * @param {Object} options
 * @param {Object} options.bot
 * @param {String} options.to email || accountNumber
 * @param {String} options.sum
 * @param {String} options.chatId
 * @param {String} options.accessToken
 * @param {String} options.holdForPickup
 * @param {Function} processComplete callback
 */
function startP2P(options, processComplete) {
	var api = new Wallet(options.accessToken);

	// make request payment and process it
	var requestOptions = {
		"pattern_id": "p2p",
		"to": options.to,
		"amount_due": options.sum,
		"comment": "test payment comment from yandex-money-nodejs",
		"message": "test payment message from yandex-money-nodejs",
		"label": "testPayment",
		"hold_for_pickup": options.holdForPickup
	};

	api.requestPayment(requestOptions, function requestComplete(err, data) {
		console.log('-----------------requestComplete-----------------');
		console.log(err);
		console.log(data);
		if (err) {
			// process error
		}
		if (data.status !== "success") {
			// process failure
		}
		var requestId = data['request_id'];

		api.processPayment({
			"request_id": requestId
			}, processComplete);
	});
}

module.exports = p2pHandler;
