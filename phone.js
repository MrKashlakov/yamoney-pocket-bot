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
	bot.sendMessage(chatId, 'Вы выбрали опцию перевод на телефон. '
			+ 'Введите телефон в формате 79219990099', forceReplyOpts)
	.then(function (sended) {
		var chatId = sended.chat.id;
		var messageId = sended['message_id'];
		bot.onReplyToMessage(chatId, messageId, function (msg) {
			msg = msg.text;
			var phone = msg;
			bot.sendMessage(chatId, 'Итак вы хотите перевести рублики на ' + msg
					+ '. Теперь введите сумму, пожалуйста', forceReplyOpts)
			.then(function (sended) {
					var chatId = sended.chat.id;
					var messageId = sended['message_id'];
					bot.onReplyToMessage(chatId, messageId, function (sum) {
						sum = sum.text;
						bot.sendMessage(chatId, 'Итак, вы хотите перевести '
							+ sum + '. Начинаем, блеать!');

						startPhone({
							bot: bot,
							phone: phone,
							amount: sum,
							accessToken: accessToken
						}, processComplete);
					});
				});
		});
	});
}

/**
 * @param {Object} options
 * @param {Object} options.bot
 * @param {String} options.phone phone
 * @param {String} options.sum
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
		"amount": options.sum
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

module.exports = phoneHandler;
