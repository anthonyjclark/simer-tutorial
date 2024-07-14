declare module 'htl' {

	export declare const html: { <T extends HTMLElement | Text>( ...args: any[] ): T, fragment( ...args: any[] ): DocumentFragment };
	export declare const svg: { <T extends SVGElement | Text>( ...args: any[] ): T, fragment( ...args: any[] ): DocumentFragment };

}
