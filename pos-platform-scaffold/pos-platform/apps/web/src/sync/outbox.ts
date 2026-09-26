// Append-only pending mutations. Every write generates a client_id UUID and
// lands here first, in state PENDING, before anything touches the network.
export {};
