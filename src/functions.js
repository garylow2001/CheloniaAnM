const constants = require('./constants.js');

const pairingNotFoundMessage = constants.pairingNotFoundMessage;
const aboutMessage = constants.aboutMessage;
const helpMessage = constants.helpMessage;
const startMessage = constants.startMessage;
const importantMessage = constants.importantMessage;
const verifyAdminMessage = constants.verifyAdminMessage;
const messageSentMessage = constants.messageSentMessage;
const accessAngelSuccessMessage = constants.accessAngelSuccessMessage;
const accessMortalSuccessMessage = constants.accessMortalSuccessMessage;
const adminPairingsRetrievedMessage = constants.adminPairingsRetrievedMessage;

export async function processAction(responses, id) {
	let result = responses[0].queryResult;
	const inputParams = result.parameters.fields;
	let responseText = result.fulfillmentText;
	let sendingStyle = null;
	let responseOptions = { parse_mode: "Markdown" };
	let dateNow = new Date(Date.now());

	switch (result.action) {

		case 'get-gender':
			responseOptions.reply_markup = genderSelectKeyboard;
			break;

		case 'get-house':
			responseOptions.reply_markup = houseSelectKeyboard;
			break;

		case 'update-user':
			const contextParameters = result.outputContexts[0].parameters.fields;
			const gender = contextParameters["gender"].stringValue;
			const house = contextParameters["house"].stringValue;
			const details = result.queryText;
			await updateUser(id, gender, house, details);
			console.log("Registered: " + gender + house + ' / House ' + ' / ' + details);
			responseText = result.fulfillmentText;
			responseOptions = null;
			break;

		case 'send-message-to-angel':
			const angelId = await getAngel(id);
			if (!angelId) responseText = pairingNotFoundMessage;
			else {
				bot.sendMessage(angelId, "👨‍🦲 *MORTAL*\n💬: " + result.queryText, { parse_mode: "Markdown" });
				responseText = messageSentMessage;
			}
			responseOptions = null;
			break;

		case 'send-message-to-mortal':
			const mortalId = await getMortal(id);
			if (!mortalId) responseText = pairingNotFoundMessage;
			else {
				bot.sendMessage(mortalId, "👼 *ANGEL*\n💬: " + result.queryText, { parse_mode: "Markdown" });
				responseText = messageSentMessage;
			}
			responseOptions = null;
			break;

		default:
			responseText = null;
			responseOptions = null;
	}

	return {
		message: responseText,
		options: responseOptions,
		sendingStyle: sendingStyle
	}
}

export async function sendMessageToAngel(mortalId, message) {
	const angelId = await getAngel(mortalId);
	if (!angelId) bot.sendMessage(mortalId, pairingNotFoundMessage);
	else {
		try {
			await bot.sendMessage(angelId, "👨‍🦲 *MORTAL*\n💬: " + message, { parse_mode: "Markdown" });
			//bot.sendMessage(mortalId, messageSentMessage);
		} catch (e) {
			try {
				console.log("Error. Trying HTML parse mode...");
				await bot.sendMessage(angelId, "👨‍🦲 *MORTAL*\n💬: " + message, { parse_mode: "HTML" });
				//bot.sendMessage(mortalId, messageSentMessage);		
			} catch (e) {
				console.log("Error.");
				bot.sendMessage(mortalId, "Error sending message! :(\n\nPlease try again.");
			}
		}

	}
}

export async function sendMessageToMortal(angelId, message) {
	const mortalId = await getMortal(angelId);
	if (!mortalId) bot.sendMessage(angelId, pairingNotFoundMessage);
	else {
		try {
			await bot.sendMessage(mortalId, "👼 *ANGEL*\n💬: " + message, { parse_mode: "Markdown" });
			//bot.sendMessage(angelId, messageSentMessage);
		} catch (e) {
			try {
				console.log("Error. Trying HTML parse mode...");
				await bot.sendMessage(mortalId, "👼 *ANGEL*\n💬: " + message, { parse_mode: "HTML" });
				//bot.sendMessage(angelId, messageSentMessage);
			} catch (e) {
				console.log("Error.");
				bot.sendMessage(angelId, "Error sending message! :(\n\nPlease try again.")
			}
		}
	}
}

export async function processCallbackQuery(query) {
	const chatId = query.from.id;
	const queryId = query.id;
	const messageId = query.message.message_id;
	let callbackData = query.data;

	let responseText = '';
	let sendingStyle = null;
	let responseOptions = { parse_mode: "Markdown" };

	switch (callbackData.split(' ')[0]) {

		default:

	}
}
///* helper functions *///

export async function sendWithoutDialogflow(chatId, dummyResponse) {
	bot.sendChatAction(chatId, "typing");
	const result = await processAction(dummyResponse, chatId);
	bot.sendMessage(chatId, result.responseText, result.responseOptions);
}

export async function sendMultipleMessages(chatId, msgs, delay) {
	bot.sendMessage(chatId, msgs.shift());
	for (const i in msgs) {
		bot.sendChatAction(chatId, "typing");
		await sleep(delay);
		bot.sendMessage(chatId, msgs[i]);
		await sleep(500);
	}
}

