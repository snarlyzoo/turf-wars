export interface GameMap extends Model {
	Team1Spawn: TeamSpawn;
	Team2Spawn: TeamSpawn;

	TurfLines: Folder;
}

export interface TeamSpawn extends Model {
	SpawnLocations: Folder;
	TeamColorParts: Folder;
}
