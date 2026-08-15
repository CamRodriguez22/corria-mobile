import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_nirWPCLK5',
      userPoolClientId: '5vp9op8mlq07qbahpna4fjeld0',
      region: 'us-east-1'
    }
  }
});