var express = require("express");
var router = express.Router();
var config = require("../config/config");

const restClient = require("superagent-bluebird-promise");
const path = require("path");
const url = require("url");
const util = require("util");
const Promise = require("bluebird");
const _ = require("lodash");
const querystring = require("querystring");
const securityHelper = require("../lib/security/security");
const crypto = require("crypto");
const colors = require("colors");

// ####################
// Setup Configuration
// ####################

// LOADED FRON ENV VARIABLE: public key from MyInfo Consent Platform given to you during onboarding for RSA digital signature
var _publicCertContent = config.APP_CONFIG.MYINFO_SIGNATURE_CERT_PUBLIC_CERT;
// LOADED FRON ENV VARIABLE: your private key for RSA digital signature
var _privateKeyContent = config.APP_CONFIG.DEMO_APP_SIGNATURE_CERT_PRIVATE_KEY;
// LOADED FRON ENV VARIABLE: your client_id provided to you during onboarding
var _clientId = config.APP_CONFIG.MYINFO_APP_CLIENT_ID;
// LOADED FRON ENV VARIABLE: your client_secret provided to you during onboarding
var _clientSecret = config.APP_CONFIG.MYINFO_APP_CLIENT_SECRET;
// redirect URL for your web application
var _redirectUrl = config.APP_CONFIG.MYINFO_APP_REDIRECT_URL;

// URLs for MyInfo APIs
var _authLevel = config.APP_CONFIG.AUTH_LEVEL;

var _authApiUrl = config.APP_CONFIG.MYINFO_API_AUTHORISE;
var _tokenApiUrl = config.APP_CONFIG.MYINFO_API_TOKEN;
var _personApiUrl = config.APP_CONFIG.MYINFO_API_PERSON;

var _attributes =
  "uinfin,name,sex,race,nationality,dob,email,mobileno,regadd,housingtype,hdbtype,marital,edulevel,noa-basic,ownerprivate,cpfcontributions,cpfbalances";

// callback function - directs back to home page
router.get("/callback", async (req, res) => {
  console.log("Response code: ", req.query.code);
  console.log("Response state: ", req.query.state);
  res.redirect(
    `https://main.d1qsaxxb4e74cl.amplifyapp.com/hp-applications/create/callback?code=${req.query.code}&state=${req.query.state}`
  );
});

// function for getting environment variables to the frontend
router.get("/getEnv", function (req, res, next) {
  if (_clientId == undefined || _clientId == null)
    res.jsonp({
      status: "ERROR",
      msg: "client_id not found",
    });
  else
    res.jsonp({
      status: "OK",
      clientId: _clientId,
      redirectUrl: _redirectUrl,
      authApiUrl: _authApiUrl,
      attributes: _attributes,
      authLevel: _authLevel,
    });
});

// function for frontend to call backend
router.post("/getPersonData", async (req, res) => {
  // get variables from frontend
  var code = req.body.code;
  console.log("Code From FrontENd", code);

  var data;
  var request;

  // **** CALL TOKEN API ****
  request = createTokenRequest(code);
  request.buffer(true).end(function (callErr, callRes) {
    if (callErr) {
      // ERROR
      console.error("Token Call Error: ", callErr.status);
      console.error(callErr.response.req.res.text);
      res.jsonp({
        status: "ERROR",
        msg: callErr,
      });
    } else {
      // SUCCESSFUL
      var data = {
        body: callRes.body,
        text: callRes.text,
      };
      console.log("Response from Token API:".green);
      console.log(JSON.stringify(data.body));

      var accessToken = data.body.access_token;
      if (accessToken == undefined || accessToken == null) {
        res.jsonp({
          status: "ERROR",
          msg: "ACCESS TOKEN NOT FOUND",
        });
      }

      // everything ok, call person API
      callPersonAPI(accessToken, res);
    }
  });
});

function callPersonAPI(accessToken, res) {
  console.log("AUTH_LEVEL:".green, _authLevel);

  // validate and decode token to get SUB
  var decoded = securityHelper.verifyJWS(accessToken, _publicCertContent);
  if (decoded == undefined || decoded == null) {
    res.jsonp({
      status: "ERROR",
      msg: "INVALID TOKEN",
    });
  }

  console.log("Decoded Access Token:".green);
  console.log(JSON.stringify(decoded));

  var sub = decoded.sub;
  if (sub == undefined || sub == null) {
    res.jsonp({
      status: "ERROR",
      msg: "SUB NOT FOUND",
    });
  }

  // **** CALL PERSON API ****
  var request = createPersonRequest(sub, accessToken);

  // Invoke asynchronous call
  request.buffer(true).end(function (callErr, callRes) {
    if (callErr) {
      console.error("Person Call Error: ", callErr.status);
      console.error(callErr.response.req.res.text);
      res.jsonp({
        status: "ERROR",
        msg: callErr,
      });
    } else {
      // SUCCESSFUL
      var data = {
        body: callRes.body,
        text: callRes.text,
      };
      var personData = data.text;
      if (personData == undefined || personData == null) {
        res.jsonp({
          status: "ERROR",
          msg: "PERSON DATA NOT FOUND",
        });
      } else {
        if (_authLevel == "L0") {
          console.log("Person Data:".green);
          console.log(personData);
          personData = JSON.parse(personData);
          // personData = securityHelper.verifyJWS(personData, _publicCertContent);

          if (personData == undefined || personData == null) {
            res.jsonp({
              status: "ERROR",
              msg: "INVALID DATA OR SIGNATURE FOR PERSON DATA",
            });
          }

          // successful. return data back to frontend
          res.jsonp({
            status: "OK",
            text: personData,
          });
        } else if (_authLevel == "L2") {
          console.log("Person Data (JWE):".green);
          console.log(personData);

          var jweParts = personData.split("."); // header.encryptedKey.iv.ciphertext.tag
          securityHelper
            .decryptJWE(
              jweParts[0],
              jweParts[1],
              jweParts[2],
              jweParts[3],
              jweParts[4],
              _privateKeyContent
            )
            .then((personDataJWS) => {
              if (personDataJWS == undefined || personDataJWS == null) {
                res.jsonp({
                  status: "ERROR",
                  msg: "INVALID DATA OR SIGNATURE FOR PERSON DATA",
                });
              }
              console.log("Person Data (JWS):".green);
              console.log(JSON.stringify(personDataJWS));

              var decodedPersonData = securityHelper.verifyJWS(
                personDataJWS,
                _publicCertContent
              );
              if (decodedPersonData == undefined || decodedPersonData == null) {
                res.jsonp({
                  status: "ERROR",
                  msg: "INVALID DATA OR SIGNATURE FOR PERSON DATA",
                });
              }

              console.log("Person Data (Decoded):".green);
              console.log(JSON.stringify(decodedPersonData));
              // successful. return data back to frontend
              res.jsonp({
                status: "OK",
                text: decodedPersonData,
              });
            })
            .catch((error) => {
              console.error("Error with decrypting JWE: %s".red, error);
            });
        } else {
          throw new Error("Unknown Auth Level");
        }
      } // end else
    }
  }); //end asynchronous call
}

// function to prepare request for TOKEN API
function createTokenRequest(code) {
  var cacheCtl = "no-cache";
  var contentType = "application/x-www-form-urlencoded";
  var method = "POST";

  // assemble params for Token API
  var strParams =
    "grant_type=authorization_code" +
    "&code=" +
    code +
    "&redirect_uri=" +
    _redirectUrl +
    "&client_id=" +
    _clientId +
    "&client_secret=" +
    _clientSecret;
  var params = querystring.parse(strParams);

  // assemble headers for Token API
  var strHeaders = "Content-Type=" + contentType + "&Cache-Control=" + cacheCtl;
  var headers = querystring.parse(strHeaders);

  // Add Authorisation headers for connecting to API Gateway
  var authHeaders = null;
  if (_authLevel == "L0") {
    // No headers
  } else if (_authLevel == "L2") {
    authHeaders = securityHelper.generateAuthorizationHeader(
      _tokenApiUrl,
      params,
      method,
      contentType,
      _authLevel,
      _clientId,
      _privateKeyContent,
      _clientSecret
    );
  } else {
    throw new Error("Unknown Auth Level");
  }

  if (!_.isEmpty(authHeaders)) {
    _.set(headers, "Authorization", authHeaders);
  }

  console.log("Request Header for Token API:".green);
  console.log(JSON.stringify(headers));

  var request = restClient.post(_tokenApiUrl);

  // Set headers
  if (!_.isUndefined(headers) && !_.isEmpty(headers)) request.set(headers);

  // Set Params
  if (!_.isUndefined(params) && !_.isEmpty(params)) request.send(params);

  return request;
}

// function to prepare request for PERSON API
function createPersonRequest(sub, validToken) {
  var url = _personApiUrl + "/" + sub + "/";
  var cacheCtl = "no-cache";
  var method = "GET";

  // assemble params for Person API
  var strParams = "client_id=" + _clientId + "&attributes=" + _attributes;

  var params = querystring.parse(strParams);

  // assemble headers for Person API
  var strHeaders = "Cache-Control=" + cacheCtl;
  var headers = querystring.parse(strHeaders);

  // Add Authorisation headers for connecting to API Gateway
  var authHeaders = securityHelper.generateAuthorizationHeader(
    url,
    params,
    method,
    "", // no content type needed for GET
    _authLevel,
    _clientId,
    _privateKeyContent,
    _clientSecret
  );

  // NOTE: include access token in Authorization header as "Bearer " (with space behind)
  if (!_.isEmpty(authHeaders)) {
    _.set(headers, "Authorization", authHeaders + ",Bearer " + validToken);
  } else {
    _.set(headers, "Authorization", "Bearer " + validToken);
  }

  console.log("Request Header for Person API:".green);
  console.log(JSON.stringify(headers));
  // invoke person API
  var request = restClient.get(url);

  // Set headers
  if (!_.isUndefined(headers) && !_.isEmpty(headers)) request.set(headers);

  // Set Params
  if (!_.isUndefined(params) && !_.isEmpty(params)) request.query(params);

  return request;
}

module.exports = router;
