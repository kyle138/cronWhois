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

module.exports.handler = async event => {
  console.log("Received event:",JSON.stringify(event,null,2));  // DEBUG:

  // Check if DOMAIN has been set as an environment variable. (REQUIRED)
  if(!process.env.DOMAINS) {
    console.log("process.env.DOMAINS missing.");  // DEBUG:
    throw new Error("process.env.DOMAINS missing.");
  }

  // DOMAINS is a space-separated list of domains, check them all
  return await Promise.all(
    process.env.DOMAINS.split(' ').map( async domain => {
      return await isRegistered(domain);
      // .then(isRegd => {
      //   console.log(`${domain}: `,JSON.stringify(isRegd,null,2));  // DEBUG:
      //   if(!isRegd.isRegistered) {
      //     console.log(`The domain: ${domain} is not registered.`);  // DEBUG:
      //   }
      // });  // End isRegistered.then
    })  // End map
  ) // end Promise.all
  .then((results) => {
    console.log('Promise.all.then:results;',JSON.stringify(results,null,2));  // DEBUG:
    results.map( async resp => {
      if(!resp.isRegistered) {
        console.log('Resp:',JSON.stringify(resp,null,2)); // DEBUG:
      }
    });
  })  // End Promise.all.then
  .then(() => {
    return { message: 'All domains checked.'};
  })  // end Promise.all.then.then
  .catch((err) => {
    console.log('Promise.all.catch:',err);  // DEBUG:
    throw new Error(err);
  }); // end Promise.all.catch
};
