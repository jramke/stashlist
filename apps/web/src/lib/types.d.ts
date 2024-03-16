export type Save = {
	id?: string;
	title: string;
	description: string;
	url: string;
	imageUrl: string;
	faviconUrl: string;
	createdAt?: Date;
	type: 'website' | 'image';
};

export type TODO = any;