export interface GameMap extends Model {
	Team1Spawn: TeamSpawn;
	Team2Spawn: TeamSpawn;

	TurfLines: Folder;
}

export interface TeamSpawn extends Model {
	SpawnBarriers: Folder;
	SpawnLocations: Folder;
	TeamColorParts: Folder;
}
