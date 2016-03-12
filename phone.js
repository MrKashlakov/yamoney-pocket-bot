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
 * @param {Function} processComplete callback
 */
function phoneHandler(options, processComplete) {
	var chatId = options.chatId;
	var accessToken = options.accessToken;
	var bot = options.bot;
	bot.sendMessage(chatId, 'Пополнить счет мобильного телефона - не проблема! Введите номер '
			+ 'телефона, а через пробел сумму. Минимальная сумма 2 рубля', forceReplyOpts)
	.then(function (sended) {
		var chatId = sended.chat.id;
		var messageId = sended['message_id'];
		bot.onReplyToMessage(chatId, messageId, function (msg) {
			msg = msg.text.split(' ');
			var phone = msg[0];
			var sum = msg[1];

			if (sum) {
				startPhone({
					bot: bot,
					phone: phone,
					amount: sum,
					accessToken: accessToken,
					chatId: chatId
				}, processComplete);
			} else {
				bot.sendMessage(chatId, 'Теперь введите сумму, пожалуйста', forceReplyOpts)
				.then(function (sended) {
						var chatId = sended.chat.id;
						var messageId = sended['message_id'];
						bot.onReplyToMessage(chatId, messageId, function (sum) {
							sum = sum.text;

							startPhone({
								bot: bot,
								phone: phone,
								amount: sum,
								accessToken: accessToken,
								chatId: chatId
							}, processComplete);
						});
					});
			}
		});
	});
}

/**
 * @param {Object} options
 * @param {Object} options.bot
 * @param {String} options.phone phone
 * @param {String} options.amount
 * @param {String} options.chatId
 * @param {String} options.accessToken
 * @param {Function} processComplete callback
 */
function startPhone(options, processComplete) {
	var api = new Wallet(options.accessToken);

	// make request payment and process it
	var requestOptions = {
		"pattern_id": "phone-topup",
		"phone-number": options.phone,
		"amount": options.amount
	};

	api.requestPayment(requestOptions, function requestComplete(err, data) {
		console.log('-----------------requestComplete-----------------');
		console.log(err);
		console.log(data);
		if (err) {
			// process error
			bot.sendMessage(options.chatId, 'Видимо мы что то напутали, так как мне не удалось пополнить'
				+ ' счет сотового телефона, попробуем снова: /phone')
			return;
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

module.exports = phoneHandler;
