import { redirect } from '@sveltejs/kit';
import { stringify } from 'querystring';

import { CLIENT_ID } from '$env/static/private';
import { REDIRECT_URI } from '$env/static/private';

import type { PageLoad } from './$types';


export const load: PageLoad = async () => {
    const URL: string = "https://accounts.spotify.com/authorize?" +
        stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: 'playlist-read-private',
            redirect_uri: REDIRECT_URI,
            state: '123',
        })

    redirect(303, URL);
}

