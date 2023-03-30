import { Amplify, Hub } from 'aws-amplify';

import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

import { DynamoDBClient, ExecuteStatementCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import awsExports from './aws-exports';
Amplify.configure(awsExports);

const registerUserLogin = (user) => {
  user.getSession((error, session) => {
    if(!error){
      const cognitoUserPoolUrl = `cognito-idp.${awsExports.Auth.region}.amazonaws.com/${awsExports.Auth.userPoolId}`;

      const cognitoidentity = new CognitoIdentityClient({
        credentials:  fromCognitoIdentityPool({
            client: new CognitoIdentityClient({ region: awsExports.Auth.identityPoolRegion }),
            identityPoolId: awsExports.Auth.identityPoolId,
              logins: {
                  [cognitoUserPoolUrl]: session.getIdToken().getJwtToken()
              }
        }),
      });

      cognitoidentity.config.credentials().then(credentials => {
        const dynamoDbClient = new DynamoDBClient({ region: awsExports.Auth.region, credentials: credentials });
        const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);
        const params = {
          Statement: "INSERT INTO \"demo-table\" value {'userId':?, 'loginAt':?}",
          Parameters: [{ S: credentials.identityId }, { S: new Date() }],
        };

        dynamoDbDocumentClient.send(new ExecuteStatementCommand(params)).then(() => {}).catch(err => console.error(err))
      }).catch(err => console.error(err));
    }
  });
}

Hub.listen('auth', (data) => {
  switch (data.payload.event) {
    case 'signIn':
        registerUserLogin(data.payload.data)
        break;
    default:
        break;
  }
});

function App({ signOut, user }) {
  return (
    <>
      <h1>Hello {user.username}</h1>
      <button onClick={signOut}>Sign out</button>
    </>
  );
}

export default withAuthenticator(App);