var ConversationV1 = require('watson-developer-cloud/conversation/v1');
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
var tone_detection = require('./tone_detection.js');
var restify = require('restify');
var builder = require('botbuilder');
require('dotenv').config({ silent: true });
var contexts;
var workspace_id = 'a2cd9ae5-af5f-417a-b3bf-32f26167fd08';
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

/**
 * Instantiate the Watson Conversation Service
 */
var conversation = new ConversationV1({
  username: 'e15b8d8a-776f-4f6f-9ab8-14dd916bf435', // service username
  password: 'nFxwWh6Y3tLy', //  service password
  version_date: '2017-05-26'
});

/**
 * Instantiate the Watson Tone Analyzer Service
 */
var toneAnalyzer = new ToneAnalyzerV3({
  username: '7227256e-68ec-4a66-bcdf-14e863af1414',
  password: 'oLpNsrE16pSU',
  url:'https://gateway.watsonplatform.net/tone-analyzer/api',
  version: '2017-09-21'
});

/**
 * This example stores tone for each user utterance in conversation context.
 * Change this to false, if you do not want to maintain history
 */

var maintainToneHistoryInContext = true;

/**
 * Payload for the Watson Conversation Service
 * <workspace-id> and user input text required.
 */
// var payload = {
//   workspace_id: workspace_id,
//   input: {
//     text: 'i am dying'
//   }
// };



/**
 * invokeToneConversation calls the invokeToneAsync function to get the tone information for the user's
 * input text (input.text in the payload json object), adds/updates the user's tone in the payload's context,
 * and sends the payload to the conversation service to get a response which is printed to screen.
 * @param payload a json object containing the basic information needed to converse with the Conversation Service's
 * message endpoint.
 *
 * Note: as indicated below, the console.log statements can be replaced with application-specific code to process
 * the err or data object returned by the Conversation Service.
 */

var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
// var bot = new builder.UniversalBot(connector, function (session) {
//     session.send("You said: %s", session.message.text);
// });

//
var bot = new builder.UniversalBot(connector, function (session) {

    var payload = {
        workspace_id:  workspace_id,
        context:'',
        input: { text: session.message.text}
    };


    function invokeToneConversation(payload, maintainToneHistoryInContext) {
      tone_detection
        .invokeToneAsync(payload, toneAnalyzer)
        .then(tone => {
          tone_detection.updateUserTone(
            payload,
            tone,
            maintainToneHistoryInContext
          );
          conversation.message(payload, function(err, data) {
            if (err) {
              // APPLICATION-SPECIFIC CODE TO PROCESS THE ERROR
              // FROM CONVERSATION SERVICE
              console.error('[invokeToneConversation]'+JSON.stringify(err, null, 2));
            } else {
              // APPLICATION-SPECIFIC CODE TO PROCESS THE DATA
              // FROM CONVERSATION SERVICE
              // console.log('[invokeToneConversation]'+JSON.stringify(data, null, 2));
                console.log('[invokeToneConversation]'+JSON.stringify(data  , null, 2));
            }
          });
        })
        .catch(function(err) {
          console.log('[invokeToneConversation]'+JSON.stringify(err, null, 2));
        });
    }
    // function invokeToneConversation(payload, res) {
    //   tone_detection.invokeToneAsync(payload, toneAnalyzer).then(function(tone) {
    //     tone_detection.updateUserTone(payload, tone, maintainToneHistory);
    //     conversation.message(payload, function(err, data) {
    //       var returnObject = null;
    //       if (err) {
    //         console.error(JSON.stringify(err, null, 2));
    //         returnObject = res.status(err.code || 500).json(err);
    //       } else {
    //         returnObject = res.json(updateMessage(payload, data));
    //       }
    //       return returnObject;
    //     });
    //   }).catch(function(err) {
    //     console.log(JSON.stringify(err, null, 2));
    //   });
    // }


    invokeToneConversation(payload, maintainToneHistoryInContext);

   // I use the Bot Conversation Id as identifier.
    var conversationContext = findOrCreateContext(session.message.address.conversation.id);
    if (!conversationContext) conversationContext = {};
    payload.context = conversationContext.watsonContext;
// retrieve the Bot session message, pass that message to Watson Conversation,
// retrieve the response and send back the response to Bot session.

    conversation.message(payload, function(err, response) {
     if (err) {
       session.send(err);
     } else {
       //console.log('[conv.msg]'+JSON.stringify(response, null, 2));
       session.send(response.output.text);
       conversationContext.watsonContext = response.context;
     }
    });

});
function findOrCreateContext (convId){
      // Let's see if we already have a session for the user convId
    if (!contexts)
        contexts = [];

    if (!contexts[convId]) {
        // No session found for user convId, let's create a new one
        contexts[convId] = {workspaceId: workspace_id, watsonContext: {}};
        //console.log ("new session : " + convId);
    }
return contexts[convId];
}
