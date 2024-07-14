import '../css/main.css';

import { Player } from '../lib/main';

const player = new Player( 10, 0.1 );

const form = player.create();

document.querySelector<HTMLDivElement>( '#app' )!.appendChild( form );

// document.querySelector<HTMLDivElement>( '#app' )!.textContent = 'Hello, world!';
