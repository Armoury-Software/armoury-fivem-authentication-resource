import { Inject } from 'injection-js';
import {
  Controller,
  EventListener,
  Export,
  ServerSessionService,
  type IAccount,
  ServerVirtualWorldsService,
} from '@armoury/fivem-framework';
import { AuthenticationDTO } from '@shared/models/authentication.model';
import { PlayerInfoType } from '@shared/models/player-info.type';
import { Player, PlayerBase, PlayerMonitored } from '@shared/models/player.model';
import { whirlpool } from 'hash-wasm';

@Controller()
export class Server {
  private maxIdOnServer: number = 0;

  public constructor(
    @Inject(ServerSessionService) private readonly _session: ServerSessionService,
    @Inject(ServerVirtualWorldsService) private readonly _virtualWorlds: ServerVirtualWorldsService
  ) {}

  @EventListener({ eventName: `${Cfx.Server.GetCurrentResourceName()}:authenticate` })
  public async onAuthenticateBegin(data: AuthenticationDTO, _source?: number): Promise<void> {
    const playerId: number = _source ?? Cfx.source;
    // prettier-ignore
    const hashedPassword: string = await whirlpool(this.getHashPasswordWithSalt(data.password, data.email));
    if (!data.isAuthenticating) {
      try {
        const createdAccountId: number = await this._session.register(
          playerId,
          Cfx.Server.GetPlayerName(playerId.toString()),
          hashedPassword,
          data.email
        );

        if (createdAccountId) {
          this.onAuthenticateBegin({ email: data.email, password: data.password, isAuthenticating: true }, playerId);
        } else {
          throw new Error();
        }
      } catch (error) {
        Cfx.TriggerClientEvent(
          `${Cfx.Server.GetCurrentResourceName()}:register-error`,
          playerId,
          'Registration failed - that email already exists.'
        );
      }
    } else {
      const result: IAccount = await this._session.login(playerId, data.email, hashedPassword);
      if (result) {
        this.authenticatePlayer(playerId, result);
      } else {
        // prettier-ignore
        Cfx.TriggerClientEvent('authentication:login-error', playerId, 'Authentication failed - incorrect email and password combination.');
      }
    }
  }

  // @Export()
  // public setPlayerInfo(
  //   source: number,
  //   stat: string,
  //   _value: PlayerInfoType,
  //   ignoreSQLCommand: boolean = true,
  //   ...additionalValues: { stat: string; _value: PlayerInfoType }[]
  // ): void {
  //   let value = _value;
  //
  //   if (Array.isArray(_value) || typeof _value === 'object') {
  //     value = JSON.stringify(_value);
  //   }
  //
  //   if (stat === 'cash') {
  //     global.exports['armoury-overlay'].updateItem(source, {
  //       id: stat,
  //       icon: 'attach_money',
  //       value:
  //         '$' +
  //         (Math.abs(<number>value) < 999999 ? numberWithCommas(<number>value) : toThousandsString(<number>value, 2)),
  //     });
  //
  //     const previousValue: number = this.getPlayerInfo(source, 'cash');
  //     const difference: number = Number(value) - Number(previousValue || 0);
  //     if (difference !== 0 && previousValue !== 0) {
  //       global.exports['armoury-overlay'].showMoneyGainOverlay(source, difference);
  //     }
  //   }
  //
  //   if (stat === 'id') {
  //     if (<number>value > this.maxIdOnServer) {
  //       this.maxIdOnServer = <number>value;
  //     }
  //
  //     global.exports['armoury-overlay'].updateItem(source, {
  //       id: stat,
  //       icon: 'person',
  //       value: value.toString().padStart(Math.max(6, this.maxIdOnServer.toString().length), '0'),
  //     });
  //   }
  //
  //   Cfx.Server.SetConvarReplicated(`${source}_PI_${stat}`, value.toString());
  //
  //   if (!ignoreSQLCommand && this.cachedPlayerProperties.includes(stat)) {
  //     let statsString: string = `${stat} = ?`;
  //     additionalValues.forEach((additionalValue) => {
  //       statsString += `, ${additionalValue.stat} = ?`;
  //     });
  //
  //     global.exports['oxmysql'].update_async(`UPDATE \`players\` SET ${statsString} WHERE id = ?`, [
  //       value,
  //       ...additionalValues.map((additionalValue) =>
  //         Array.isArray(additionalValue._value) || typeof additionalValue._value === 'object'
  //           ? JSON.stringify(additionalValue._value)
  //           : additionalValue._value
  //       ),
  //       this.getPlayerInfo(source, 'id'),
  //     ]);
  //   }
  // }
  //
  // @Export()
  // public async getOfflinePlayerInfo(
  //   playerDBId: number,
  //   ...stats: string[]
  // ): Promise<{ [key: string]: PlayerInfoType }[]> {
  //   let value: PlayerInfoType = await global.exports['oxmysql'].query_async(
  //     `SELECT ${stats.join(',')} FROM players WHERE id = ?`,
  //     [playerDBId]
  //   );
  //
  //   return value?.[0] || null;
  // }

  //@Export()
  //public getPlayerInfo<T extends PlayerInfoType>(source: number, stat: string): T {
  //  let value: PlayerInfoType = Cfx.Server.GetConvar(`${source}_PI_${stat}`, '-1');
  //
  //  if (isJSON(value.toString())) {
  //    value = JSON.parse(value, function (_k, v) {
  //      return typeof v === 'object' || isNaN(v) ? v : Number(v);
  //    });
  //  }
  //
  //  if (stat === 'hoursPlayed') {
  //    const computedHoursPlayed: number = Number(value) + this.computeHoursPlayed(source);
  //    this.setPlayerInfo(source, stat, computedHoursPlayed);
  //
  //    return <T>computedHoursPlayed;
  //  }
  //
  //  return <T>value;
  //}
  //
  //@Export()
  //public getAuthenticatedPlayers(withData?: boolean) {
  //  if (withData) {
  //    return Array.from(this.authenticatedPlayers.keys()).reduce(
  //      (previous, current) => ({
  //        ...previous,
  //        [current]: this.authenticatedPlayers.get(current),
  //      }),
  //      {}
  //    );
  //  }
  //
  //  return Array.from(this.authenticatedPlayers.keys());
  //}

  // private computeHoursPlayed(source: number): number {
  //   let computedHoursPlayed: number = 0;
  //   if (this.authenticatedPlayers.has(source)) {
  //     computedHoursPlayed =
  //       Math.floor(
  //         (Math.abs(this.authenticatedPlayers.get(source).lastHoursPlayedCheck.getTime() - new Date().getTime()) /
  //           (1000 * 60)) %
  //           60
  //       ) * 0.017;
  //
  //     this.authenticatedPlayers.set(source, {
  //       ...this.authenticatedPlayers.get(source),
  //       lastHoursPlayedCheck: new Date(),
  //     });
  //   }
  //
  //   return computedHoursPlayed;
  // }

  private async authenticatePlayer(target: number, account: IAccount): Promise<void> {
    const characters: Player[] = await this._session.fetch(target, account.id);

    if (characters) {
      Cfx.TriggerClientEvent(`${Cfx.Server.GetCurrentResourceName()}:account-success-client`, target);
      Cfx.emit(`${Cfx.Server.GetCurrentResourceName()}:account-success`, target, characters);
    } else {
      // prettier-ignore
      Cfx.TriggerClientEvent(`${Cfx.Server.GetCurrentResourceName()}:account-login-error`, target, 'Authentication failed - unknown error occured.');
    }
  }

  @EventListener({ eventName: 'character-creation:character-selected' })
  public async onCharacterSelected(character: any, _source?: number): Promise<void> {
    const playerId: number = _source ?? Cfx.source;
    if (Number(character.age) > 0) {
      const player: Player = await this._session.load(playerId, character.id);

      if (player) {
        this.setBasicOverlaysFor(playerId);
        global.exports['armoury'].unblockPlayerTime(playerId);

        // for (var property in stats) {
        //   if (stats.hasOwnProperty(property)) {
        //     this.setPlayerInfo(playerId, property, stats[property]);
        //     if (this.cachedPlayerProperties.indexOf(property) === -1) {
        //       this.cachedPlayerProperties.push(property);
        //     }
        //   }
        // }
        //
        // this.authenticatedPlayers.set(playerId, {
        //   ...(<PlayerMonitored>(<PlayerBase>stats)),
        //   lastHoursPlayedCheck: new Date(),
        // });

        this.spawnPlayer(playerId, !(<number[]>this._session.getPlayerInfo(playerId, 'lastLocation'))?.length);

        Cfx.TriggerClientEvent('authentication:success', playerId);
        Cfx.emit('authentication:player-authenticated', playerId, player);
      } else {
        // prettier-ignore
        Cfx.TriggerClientEvent(`${Cfx.Server.GetCurrentResourceName()}:login-error`, playerId, 'Authentication failed - unknown error.');
      }
    }
  }

  @EventListener({ eventName: 'character-creation:character-created' })
  public async onCharacterCreated(character: any, _source?: number): Promise<void> {
    const playerId: number = _source ?? Cfx.source;
    try {
      const createdCharacterId = await this._session.create(playerId);
      this._session.setPlayerInfo(
        playerId,
        'name',
        character.name,
        'cash',
        REGISTRATION_STATS.defaultCash, // TODO: Primitive value defaults should be automatically set from the session-item definition at database-level default value (e.g. class SessionCash)
        'bank',
        REGISTRATION_STATS.defaultBank, // TODO: Primitive value defaults should be automatically set from the session-item definition at database-level default value (e.g. class SessionBank)
        { executeSqlCommand: true }
      );
      // const createdCharacterId: Player = await global.exports['oxmysql'].insert_async(
      //   'INSERT INTO `players`(`accountId`, `name`, `cash`, `bank`, `outfit`) VALUES (?, ?, ?, ?, ?)',
      //   [
      //     this.playersAuthenticatedWithAccountIds.get(playerId),
      //     character.name,
      //     REGISTRATION_STATS.defaultCash,
      //     REGISTRATION_STATS.defaultBank,
      //     JSON.stringify(
      //       character.componentVariations.reduce(
      //         (previous, current, index) => ({
      //           ...previous,
      //           components: {
      //             ...previous.components,
      //             [index]: {
      //               drawableId: current[0],
      //               textureId: current[1],
      //               paletteId: current[2],
      //             },
      //           },
      //         }),
      //         {
      //           components: {
      //             clothingId: ['clothing', playerId, Date.now().toString().substring(-8)].join('_'),
      //           },
      //           title: ['clothing', playerId, Date.now().toString().substring(-8)].join('_'),
      //         }
      //       )
      //     ),
      //   ]
      // );

      if (createdCharacterId) {
        this.onCharacterSelected({ ...character, id: createdCharacterId }, playerId);
      } else {
        throw new Error();
      }
    } catch (error) {
      // prettier-ignore
      console.log(`An error has occured when creating the character for ${character.name} ([${playerId}] ${Cfx.Server.GetPlayerName(playerId.toString())})`);
    }
  }

  @EventListener()
  public onPlayerConnect(): void {
    global.exports['armoury'].blockPlayerTime(Cfx.source, 0, 0, 0);
  }

  private spawnPlayer(target: number, spawnAtDefault?: boolean): void {
    const lastLocation = <number[]>this._session.getPlayerInfo(target, 'lastLocation');
    const position: number[] = !spawnAtDefault
      ? lastLocation.slice(0, 4)
      : [248.3087615966797, -342.34698486328127, 44.46502304077148];

    if (lastLocation && lastLocation[4]) {
      Cfx.Server.SetEntityRoutingBucket(Cfx.Server.GetPlayerPed(target.toString()), lastLocation[4]); // TODO: Set routing bucket in ServerVirtualWorldsService
      this._virtualWorlds.setPlayerVirtualWorld(target, lastLocation[4]);
    }

    Cfx.TriggerClientEvent('authentication:spawn-player', target, position);
  }

  // @EventListener()
  // public onResourceStop(resourceName: string): void {
  //   if (resourceName === Cfx.Server.GetCurrentResourceName()) {
  //     Array.from(this.authenticatedPlayers.keys()).forEach((player: number) => {
  //       this.savePlayerCriticalStats(player);
  //     });
  //
  //     this.authenticatedPlayers.clear();
  //   }
  // }

  private getHashPasswordWithSalt(password: string, email: string): string {
    return email.slice(0, 3) + password + email.slice(3, 6);
  }

  private setBasicOverlaysFor(playerId: number): void {
    global.exports['armoury-overlay'].updateItem(playerId, {
      id: 'cash',
      icon: 'attach_money',
      value: '$0',
    });
    global.exports['armoury-overlay'].updateItem(playerId, {
      id: 'id',
      icon: 'person',
      value: 'ID 0',
    });
    global.exports['armoury-overlay'].updateItem(playerId, {
      id: 'level',
      icon: 'hourglass_bottom',
      value: 'Level 1',
    });
    global.exports['armoury-overlay'].updateItem(playerId, {
      id: 'hunger',
      icon: 'lunch_dining',
      value: '100%',
    });
    global.exports['armoury-overlay'].updateItem(playerId, {
      id: 'thirst',
      icon: 'water_drop',
      value: '100%',
    });
    global.exports['armoury-overlay'].updateItem(playerId, {
      id: 'mic',
      icon: 'volume_down',
      value: '0%',
      redIgnored: true,
    });
  }
}

// TODO: Extract this to an injection token, configurable for this resource
const REGISTRATION_STATS = {
  defaultCash: 500,
  defaultBank: 1000,
};
