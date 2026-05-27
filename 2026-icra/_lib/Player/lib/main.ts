import { html } from 'htl';

export class Player {

	frame: number | null;

	prevTime: number;
	accumulator: number;
	running: boolean;
	timeStep: number;
	numSteps: number;

	update: ( time: number ) => void;
	reset: () => void;

	form: HTMLFormElement;

	constructor( timeEnd: number, timeStep: number, update: ( time: number ) => void, reset: () => void ) {

		// TODO: remove frame? no longer canceling
		this.frame = null;

		this.prevTime = 0;

		this.accumulator = 0;

		this.running = false;

		this.timeStep = timeStep;

		this.numSteps = timeEnd / timeStep + 1;

		this.update = update;

		this.reset = reset;

		this.form = html`<form>

			<button name="b" type="button" style="margin: 0.4em; width: 5em;"></button>

			<button name="r" type="button" style="margin: 0.4em; width: 5em;">Reset</button>

			<label style="display: flex; align-items: center;">

				<input
					name="i"
					type="range"
					min="0"
					max="${this.numSteps - 1}"
					value="0"
					step="1"
					style="width: 180px;"
					disabled
				/>

				<output name="o" style="margin-left: 0.4em;"></output>

			</label>

		</form>`;

		this.form.i.oninput = () => {

			this.form.o.value = ( this.form.i.valueAsNumber * timeStep ).toFixed( 2 );

		};

		this.form.b.onclick = () => {

			if ( this.running ) return this.#stop();

			this.form.i.valueAsNumber = this.#nextValue();
			this.form.i.dispatchEvent( new CustomEvent( 'input', { bubbles: true } ) );
			this.#start();

		};

		this.form.r.onclick = () => {

			if ( this.running ) this.#stop();

			this.form.i.valueAsNumber = 0;
			this.form.i.dispatchEvent( new CustomEvent( 'input', { bubbles: true } ) );

			this.reset();

		};

		// TODO: figure out if this is necessary
		// Inputs.disposal( this.form ).then( stop );

	}

	create(): HTMLFormElement {

		this.form.i.oninput();

		this.#stop();
		this.#tick( 0 );

		return this.form;

	}

	#nextValue(): number {

		return ( this.form.i.valueAsNumber + 1 + this.numSteps ) % this.numSteps;

	}

	#start() {

		this.prevTime = 0;
		this.accumulator = 0.0;
		this.running = true;

		this.form.b.textContent = 'Pause';
		this.frame = requestAnimationFrame( time => this.#tick( time ) );

	}

	#stop() {

		this.form.b.textContent = 'Play';
		this.running = false;
		this.accumulator = 0.0;

	}

	#tick( now: number ) {

		if ( ! this.prevTime ) this.prevTime = now;
		let dt = now - this.prevTime;
		this.prevTime = now;

		if ( this.form.i.valueAsNumber === ( this.numSteps - 1 ) ) this.#stop();

		if ( this.running ) {

			this.accumulator += dt;

			if ( this.accumulator >= this.timeStep * 1000.0 ) {

				this.form.i.valueAsNumber = this.#nextValue();
				this.form.i.dispatchEvent( new CustomEvent( 'input', { bubbles: true } ) );
				this.accumulator -= this.timeStep * 1000.0;

			}

		}

		this.update( this.form.i.valueAsNumber * this.timeStep + this.accumulator / 1000.0 );

		this.frame = requestAnimationFrame( time => this.#tick( time ) );

	}

}
