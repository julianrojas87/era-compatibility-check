import { JsonLdParser } from "jsonld-streaming-parser";
import { StreamParser } from "n3";
import { quadToStringQuad } from 'rdf-string';

self.addEventListener('message', async e => {
    // console.log(`Fetching RDF resource ${e.data.url}`)

    const res = await fetch(e.data.url, { headers: e.data.headers || [] });
    // Get the HTTP response as a ReadableStream
    // let stream = null;

    if (res.ok) {
        const contentType = res.headers.get('Content-Type');
        let parser = null;
        let data = null;

        if (contentType.includes('application/ld+json')) {
            // JSON-LD streaming parser
            parser = new JsonLdParser();
            // Hack to read HTTP response in a streaming way
            data = JSON.stringify(await res.json(), null, 3).split('\n');
        } else if (contentType.includes('application/n-quads')) {
            parser = new StreamParser({ format: 'N-Quads' });
            data = await res.text();
        } else if (contentType.includes('text/turtle')) {
            parser = new StreamParser({ format: 'Turtle' });
            //stream = res.body.getReader();
            data = await res.text();
        }

        parser.on('data', quad => {
            self.postMessage(quadToStringQuad(quad));
        })
            .on('error', console.error)
            .on('end', () => {
                //console.log(`RDF resource ${e.data.url} completely fetched after ${new Date() - t0} ms`);
                self.postMessage('done');
            });

        if (!data) {
            // process response as a stream
            /*for await (const d of readStream(stream)) {
                //console.log(d);
                //parser.write(d);
            }*/
        } else {
            if (Array.isArray(data)) {
                for (const d of data) {
                    parser.write(d);
                }
            } else {
                parser.write(data);
            }
        }

        parser.end();
    } else {
        self.postMessage('done');
    }
});

// Function to read fetch response as a stream
// Sometimes it gives incomplete data which crashes the parsing process :(
/*async function* readStream(stream) {
    const decoder = new TextDecoder('utf-8');
    let readable = true;
    while (readable) {
        const { value, done } = await stream.read();
        const dv = decoder.decode(value);
        console.log('VALUE:', dv);
        yield dv
        readable = done;
    }
}*/