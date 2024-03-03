import { Server_Init, ServerSessionService } from '@armoury/fivem-roleplay-gamemode';
import { Server } from './controllers/server.controller';

Server_Init(Server, ServerSessionService.withDefaults());
