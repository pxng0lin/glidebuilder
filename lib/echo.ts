import Echo from '@merit-systems/echo-next-sdk';

const appId = process.env.NEXT_PUBLIC_ECHO_APP_ID ?? '';
const environment = process.env.NEXT_PUBLIC_ECHO_ENV;

if (!appId) {
  console.warn('[echo] NEXT_PUBLIC_ECHO_APP_ID is missing.');
}

type EchoConfig = Parameters<typeof Echo>[0];
type ExtendedEchoConfig = EchoConfig & {
  environment?: string;
};

const echoConfig: ExtendedEchoConfig = {
  appId,
};

if (environment) {
  echoConfig.environment = environment;
}

const echo = Echo(echoConfig);

export const { handlers, isSignedIn, getUser, openai, anthropic, google } = echo;

export { echo };
