export function hasCronArtifactSyncCredentials(settings = {}) {
    return Boolean(settings?.gistToken);
}
