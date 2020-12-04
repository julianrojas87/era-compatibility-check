const HtmlWebPackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            },
            {
                test: /\.html$/,
                exclude: /node_modules/,
                use: {
                    loader: "html-loader"
                }
            },
            {
                test: /\.worker\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "worker-loader"
                }
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(png|svg|jpg|gif)$/i,
                use: [
                    {
                        loader: 'file-loader'
                    }
                ]
            },
            {
                test: /\.md$/i,
                use: 'raw-loader'
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from:"src/docs/img", to: "img"}
            ]
        }),
        new HtmlWebPackPlugin({
            template: "./src/index.html",
            filename: "./index.html",
            favicon: "./src/img/favicon.png"
        })
    ],
    output: {
        globalObject: "this",
        libraryTarget: "this"
    }
};