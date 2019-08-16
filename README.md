# Serverless cronWhois
A lambda function that runs at a set rate to check whois registration status for a specified list of domains. It then sends a notification via SNS in the event a domain is unregistered. This can be used to monitor the availability of a parked domain.

## How It Works
The idea being that if the current domain owner fails to renew the registration, a whois lookup will no longer return a complete result. This function checks for the
presence of the 'domainName' or 'domain' property on the result set. If both of those
are missing it assumes the domain is not registered and proceeds to send a notification via SNS.

## Configuration
In the **serverless.yml** file, locate the **custom.domains** section. This will contain a space-separated list of domains within double quotes. Simply edit this for the list of domains you wish to monitor.

**eg:**
```javascript
custom:
  # Space separated list of domains to check
  domains: "example.com cocacola.com doesnotexist31415926.com"
```
## Deploying
Deploy the function to AWS using serverless deploy. During the deploy process the SNS topic **cronWhoisTopic-${stage}** will be created. Afterwards you will need to subscribe to this topic with your preferred protocol.

**eg:**
```bash
serverless deploy -s dev -v
```
## Credits
This function uses the [whois-json](https://www.npmjs.com/package/whois-json) NPM module.
