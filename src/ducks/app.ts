export type SystemMessage<meta> = {
  text: string;
  type: 'info' | 'error' | 'success';
  meta?: meta;
}

type AppState = {
  handshakeEndHeight: number;
  lastSync: number;
  messages: SystemMessage<any>[];
}
