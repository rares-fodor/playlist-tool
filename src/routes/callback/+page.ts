import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
    const code: string = url.searchParams.get("code")!;
    const error: string = url.searchParams.get("error")!;
    const state: string = url.searchParams.get("state")!;

    // TODO unsure how this should be treated still
    console.log(code, error, state);
    if (error) {
        return { error };
    }

    return { code };
}

