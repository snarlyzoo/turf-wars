import React from "@rbxts/react";

interface ChampionTitleProps {
	adornee: PVInstance;
}

const ChampionTitle = (props: ChampionTitleProps): React.Element => {
	return <billboardgui Adornee={props.adornee}></billboardgui>;
};
