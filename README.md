Sendanor Cloud Backend
----------------------

This is a CLI application to run Sendanor's Cloud Service Framework.

Install: `npm i -g @sendanor/cloud-backend`

Use as a client-verified protected HTTPS server: `cloud-backend ./TestService.js --ca-file=./ca-crt.pem --key-file=./localhost-key.pem --cert-file=./localhost-crt.pem --protocol=https`

Use as an unprotected HTTP server: `cloud-backend ./TestService.js --protocol=http`

Use without a server: `cloud-backend ./TestService.js`
