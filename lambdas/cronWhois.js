'use strict';

//
// Add/configure modules
const AWS = require('aws-sdk');
const SNS = new AWS.SNS();
const whois = require('whois-json');

//
// isRegistered
// Makes a whois request of the domain provided
// Returns true if registered, otherwise false
// Arguments:
// domain - (string) Domain to check, must be of domain.tld format
async function isRegistered(domain) {
  if(!domain) {
    console.log("isRegistered: missing domain");  // DEBUG:
    throw new Error("isRegistered: missing domain");
  }
  return await whois(domain)
  .then((res) => {
    return {
      "domain": domain,
      "isRegistered": res.hasOwnProperty('domainName')
    };
  })  // end whois.then
  .catch((err) => {
    console.log('isRegistered:whois Error:',err);
    return(err);
  }); // End whois.catch
} // End isRegistered


//
// publishToSns
// Publish event to SNS
// Parameters:
// topics - (array) list of SNS Topic ARN to publish to
// data - (object) the data to publish
async function publishToSns(params) {
  console.log("publishToSns:params:",JSON.stringify(params,null,2));  // DEBUG:
  if(!params.data || !params.topics) {
    console.log("publishToSns:missing parameters.");  // DEBUG:
    return Promise.reject(new Error("publishToSns missing parameters."));
  }
  if(params.data.length < 1 || params.topics.length < 1) {
    console.log("publishToSns:empty objects."); // DEBUG:
    return Promise.reject(new Error("publishToSns:empty objects."));
  }
  return await Promise.all(
    params.topics.map(
      async topic => {
        const pubParams = {
          Message: JSON.stringify(params.data),
          Subject: 'CronWhois: Domains are unregistered!',
          TopicArn: topic
        };
        await SNS.publish(pubParams).promise()
        .then(response => {
          console.log("publishToSns:SNS.publish response: "+JSON.stringify(response,null,2)); // DEBUG:
          return;
        }); // End SNS.publish.promise.then
      } // End topic
    ) // End map
  ) // End Promise.all
  .then(() => {
    console.log("publishToSns:Promise.all.then:All messages sent.");  // DEBUG:
    return Promise.resolve;
  })  // End Promise.all.then...
  .catch((err) => {
    console.log("publishToSns:Promise.all.catch:",JSON.stringify(err,null,2));  // DEBUG:
    return Promise.reject(err);
  }); // End Promise.all.catch
} // end publishToSns


module.exports.handler = async event => {
  console.log("Received event:",JSON.stringify(event,null,2));  // DEBUG:

  // Check if DOMAIN has been set as an environment variable. (REQUIRED)
  if(!process.env.DOMAINS) {
    console.log("process.env.DOMAINS missing.");  // DEBUG:
    throw new Error("process.env.DOMAINS missing.");
  }
  // Check if TOPICS has been set as an environment variable. (REQUIRED)
  if(!process.env.TOPICS) {
    console.log("process.env.TOPICS missing.");  // DEBUG:
    throw new Error("process.env.TOPICS missing.");
  }

  // DOMAINS is a space-separated list of domains, check them all
  return await Promise.all(
    process.env.DOMAINS.split(' ').map( async domain => {
      return await isRegistered(domain);
    })  // End map
  ) // end Promise.all
  .then(async (results) => {
    console.log('Promise.all.then:whois results;',JSON.stringify(results,null,2));  // DEBUG:
    await Promise.all(
      results.map( async (resp) => {
        if(resp.isRegistered === false) {
          await publishToSns({
            data: resp,
            topics: process.env.TOPICS.split(' ')
          }); // End publishToSns
        } // End if registered
      })  // End map
    ); // end Promise.all.Promise.all
  })  // End Promise.all.then
  .then(() => {
    console.log('Promise.all.then.then:All domains checked.'); // DEBUG:
    return { message: 'All domains checked.'};
  })  // end Promise.all.then.then
  .catch((err) => {
    console.log('Promise.all.catch:',err);  // DEBUG:
    throw new Error(err);
  }); // end Promise.all.catch
};
