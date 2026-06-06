//
// cronWhois.mjs
// Lambda triggered by cron to check if domains are registered.
//

// Load modules
import { snsClient } from "../libs/snsClient.mjs";
import { PublishCommand } from "@aws-sdk/client-sns";
import { whois } from '@cleandns/whois-rdap';

//
// isRegistered
// Makes a whois request of the domain provided
// Returns true if registered, otherwise false
// Arguments:
// domain - (string) Domain to check, must be of domain.tld format
// @returns - (promise) Status object
async function isRegistered(domain) {
  if(!domain) {
    console.log("isRegistered: missing domain");  // DEBUG:
    throw new Error("isRegistered: missing domain");
  }

  try {
    const res = await whois(domain);
    console.log(`isRegistered:whois:res:(${domain})::`,JSON.stringify(res,null,2)); // DEBUG:

    return {
      domain: domain,
      isRegistered: (res.hasOwnProperty('found') && res?.found === true),
      error: false
    };
  } catch (err) {
    console.error(`isRegistered:whois Error for ${domain}:`,err);
    return {
      domain: domain,
      isRegistered: null, 
      error: true,
      errorMessage: err.message
    };
  } // End try/catch
} // End isRegistered

//
// publishToSns
// Publish event to SNS
// Parameters:
// topics - (array) list of SNS Topic ARN to publish to
// data - (object) the data to publish
// Returns: Promise
async function publishToSns(params) {
  console.log("publishToSns:params:",JSON.stringify(params,null,2));  // DEBUG:
  if(!params.topics?.length || !params.data?.length) {
    console.log(`publishToSns: Missing or empty parameters.`);
    throw new Error("publishToSns: Missing or empty params");
  }

  const pubParams = {
    Message: JSON.stringify({
      alert: 'CronWhois: Domains alerts:',
      domains: params.data
    },null,2),
    Subject: 'CronWhois: Domains are unregistered!'
  };  // end pubParams

  // Map all topics
  const pubPromises = params.topics.map(topic => {
    return snsClient.send(new PublishCommand({...pubParams, TopicArn: topic}));
  });

  try {
    await Promise.all(pubPromises);
    console.log(`publishToSns: All SNS notifications delivered.`);
    return;
  } catch (err) {
    console.error("publishToSns: Error:: Failed to send one or more messages: ",err);
    throw err;
  } // end try/catch

} // end publishToSns


// ************
// MAIN HANDLER
// ************
export const handler = async (event, context) => {
  console.log(`Received event:`,JSON.stringify(event,null,2)); // DEBUG:

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

  try {
    // DOMAINS is a space-separated list of domains, check them all
    const results = await Promise.all(process.env.DOMAINS.split(/\s+/).map(domain => isRegistered(domain)));
    console.debug(`Whois raw results:: `,JSON.stringify(results,null,2)); // DEBUG

    // Filter down to unregistered or failed lookups
    const filtered = results.filter(item => item.isRegistered === false || item.error === true);

    // Publish any alerts
    if (filtered.length > 0) {
      await publishToSns({
        topics: process.env.TOPICS.split(' '),
        data: filtered
      });
    } else {
      console.log(`All domains checked.`);
    } // End if/else filtered

    return { message: 'All domains checked.'};

  } catch (err) {
    console.error('Handler failure: ', err);
    throw err;
  } // End try/catch

};
  