import { pinsApi } from './api';
import { CreatePinRequest, Pin, UpdatePinRequest } from './types';

const actions = {
    create: (pin: CreatePinRequest) => pinsApi.create(pin),
    update: (pinId: number, changes: UpdatePinRequest) => pinsApi.update(pinId, changes),
    remove: (pinId: number) => pinsApi.remove(pinId),
    toggleVisibility: async (pin: Pin): Promise<Pin> => {
        const updated = await pinsApi.toggleVisibility(pin.id);
        return { ...pin, isPrivate: updated.isPrivate };
    },
};

export function usePinActions() {
    return actions;
}
