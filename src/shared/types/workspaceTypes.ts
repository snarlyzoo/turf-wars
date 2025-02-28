export interface GameMap extends Model {
	Team1Spawn: TeamSpawn;
	Team2Spawn: TeamSpawn;

	TurfLines: Folder;
}

export interface TeamSpawn extends Model {
	SpawnBarriers: Folder;
	SpawnLocations: Folder;
	TeamColorParts: Folder;
	MVPStage: MVPStage;
}

export interface MVPStage extends Model {
	CameraPos: PVInstance;
	Player1Pos: PVInstance;
	Player2Pos: PVInstance;
	Player3Pos: PVInstance;
}
