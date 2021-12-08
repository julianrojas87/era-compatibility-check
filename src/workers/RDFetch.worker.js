import { JsonLdParser } from "jsonld-streaming-parser";
import { RdfXmlParser } from "rdfxml-streaming-parser";
import { StreamParser } from "n3";
import { quadToStringQuad } from 'rdf-string';

self.addEventListener('message', async e => {
    // const t0 = new Date()
    // console.log(`Fetching RDF resource ${e.data.url}`)

    const res = await fetch(e.data.url, {
        method: e.data.method || 'GET',
        headers: e.data.headers || [],
        body: e.data.body ? JSON.stringify(e.data.body) : null
    });

    if (res.ok) {
        const contentType = res.headers.get('Content-Type');
        let parser = null;
        let data = null;

        if (contentType.includes('application/ld+json')) {
            // JSON-LD streaming parser
            parser = new JsonLdParser();
            // Hack to read HTTP response in a streaming way
            data = JSON.stringify(await res.json(), null, 3).split('\n');
        } else if (contentType.includes('application/n-triples')) {
            parser = new StreamParser({ format: 'N-Triples' });
            data = await res.text();
        } else if (contentType.includes('text/turtle')) {
            parser = new StreamParser({ format: 'Turtle' });
            data = await res.text();
        } else if (contentType.includes('application/rdf+xml') || contentType.includes('text/xml')) {
            parser = new RdfXmlParser();
            data = await res.text();
        } else {
            console.error(`Unrecognized Content-Type ${contentType} for resource ${e.data.url}`)
            self.postMessage('done');
            return;
        }

        parser.on('data', quad => {
            self.postMessage(quadToStringQuad(quad));
        })
            .on('error', console.error)
            .on('end', () => {
                //console.log(`RDF resource ${e.data.url} completely fetched after ${new Date() - t0} ms`);
                self.postMessage('done');
            });


        if (Array.isArray(data)) {
            data.forEach(d => parser.write(d));
        } else {
            parser.write(data);
        }

        parser.end();
    } else {
        self.postMessage('done');
    }
});


// Function to read fetch response as a line by line text stream
/*async function* readStream(res) {
    const utf8Decoder = new TextDecoder('utf-8');
    const reader = res.body.getReader();
    let { value: chunk, done: readerDone } = await reader.read();
    chunk = chunk ? utf8Decoder.decode(chunk) : '';

    const re = /\n|\r|\r\n/gm;
    let startIndex = 0;

    for (; ;) {
        let result = re.exec(chunk);
        if (!result) {
            if (readerDone) {
                break;
            }
            let remainder = chunk.substr(startIndex);
            ({ value: chunk, done: readerDone } = await reader.read());
            chunk = remainder + (chunk ? utf8Decoder.decode(chunk) : '');
            startIndex = re.lastIndex = 0;
            continue;
        }
        yield chunk.substring(startIndex, result.index);
        startIndex = re.lastIndex;
    }
    if (startIndex < chunk.length) {
        // last line didn't end in a newline char
        yield chunk.substr(startIndex);
    }
}*/