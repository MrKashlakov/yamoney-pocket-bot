"use strict";

var aesjs = require('aes-js');

var aes = {
	/**
	 * Шифрует токен доступа к Яндекс.Деньгам
	 *
	 * @param {String} userId идентификатор пользователя
	 * @param {String} token токен доступа
	 *
	 * @returns {String}
	 */
	encrypt: function (userId, token) {
		var keyBytes = aesjs.util.convertStringToBytes(userId);
		var tokenBytes = aesjs.util.convertStringToBytes(token);
		var aesCrypt = new aesjs.ModeOfOperation.ctr(keyBytes);
		var encryptedToken = aesCrypt.encrypt(tokenBytes);
		return aesjs.util.convertBytesToString(encryptedToken);
	},

	/**
	 * Расшифровывает токен доступа к Яндекс.Деньгам
	 *
	 * @param {String} userId идентификатор пользователя
	 * @param {String} encryptedToken шифрованный токен
	 *
	 * @returns {String}
	 */
	decrypt: function (userId, encryptedToken) {
		var keyBytes = aesjs.util.convertStringToBytes(userId);
		var tokenBytes = aesjs.util.convertStringToBytes(encryptedToken);
		var aesCrypt = new aesjs.ModeOfOperation.ctr(keyBytes);
		var decryptedToken = aesCrypt.decrypt(tokenBytes);
		return aesjs.util.convertBytesToString(decryptedToken);
	}
};

module.exports = aes;
