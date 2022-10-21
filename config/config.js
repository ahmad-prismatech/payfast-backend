let APP_CONFIG = {
  DEMO_APP_SIGNATURE_CERT_PRIVATE_KEY:
    "./ssl/stg-demoapp-client-privatekey-2018.pem",
  MYINFO_SIGNATURE_CERT_PUBLIC_CERT: "./ssl/staging_myinfo_public_cert.cer",

  MYINFO_APP_CLIENT_ID: "STG2-MYINFO-SELF-TEST",
  MYINFO_APP_CLIENT_SECRET: "44d953c796cccebcec9bdc826852857ab412fbe2",
  MYINFO_APP_REDIRECT_URL: "http://localhost:3001/callback",

  // # SANDBOX ENVIRONMENT (no PKI digital signature)
  AUTH_LEVEL: "L0",
  MYINFO_API_AUTHORISE: "https://sandbox.api.myinfo.gov.sg/com/v3/authorise",
  MYINFO_API_TOKEN: "https://sandbox.api.myinfo.gov.sg/com/v3/token",
  MYINFO_API_PERSON: "https://sandbox.api.myinfo.gov.sg/com/v3/person",

  // # TEST ENVIRONMENT (with PKI digital signature)
  // #  AUTH_LEVEL=L2
  // #  MYINFO_API_AUTHORISE='https://test.api.myinfo.gov.sg/com/v3/authorise'
  // #  MYINFO_API_TOKEN='https://test.api.myinfo.gov.sg/com/v3/token'
  // #  MYINFO_API_PERSON='https://test.api.myinfo.gov.sg/com/v3/person'
};

let PORT = 3001;

module.exports.APP_CONFIG = APP_CONFIG;
module.exports.PORT = PORT;
