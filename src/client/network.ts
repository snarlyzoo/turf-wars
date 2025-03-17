import CharmSync from "@rbxts/charm-sync";
import { AtomsToSync, GlobalEvents, GlobalFunctions } from "shared/network";

export const Events = GlobalEvents.createClient({});
export const Functions = GlobalFunctions.createClient({});

const syncer = CharmSync.client({
	atoms: AtomsToSync,
});
Events.SyncState.connect((payload) => syncer.sync(payload));
Events.RequestState.fire();
