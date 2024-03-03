import { ServerSessionService } from '@armoury/fivem-framework';
import { Server_Init } from '@armoury/fivem-roleplay-gamemode';
import { Server } from './controllers/server.controller';

Server_Init(
    Server,
    ServerSessionService.withDefaults()
);
