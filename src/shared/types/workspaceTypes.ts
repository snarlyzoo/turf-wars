export interface GameMap extends Model {
	Team1Spawn: TeamSpawn;
	Team2Spawn: TeamSpawn;

	TurfLines: Folder;
}

export interface TeamSpawn extends Model {
	SpawnBarriers: Folder;
	SpawnLocations: Folder;
	TeamColorParts: Folder;
	ChampionStage: ChampionStage;
}

export interface ChampionStage extends Model {
	CameraPos: PVInstance;
	Positions: Folder & {
		First: PVInstance;
		Second: PVInstance;
		Third: PVInstance;
		Fourth: PVInstance;
		Fifth: PVInstance;
	};
}
