import { DefinePlugin, LoaderOptionsPlugin } from 'webpack';
import path from 'path';

import CopyWebpackPlugin from 'copy-webpack-plugin';
import WriteFilePlugin from 'write-file-webpack-plugin';
import CleanWebpackPlugin from 'clean-webpack-plugin';

import PostcssSmartImport from 'postcss-smart-import';
import Autoprefixer from 'autoprefixer';

const port = 9000;
const bundleFolder = 'devBundle';
const binPath = path.resolve(__dirname, bundleFolder);

const entries = {
    console: {
        path: path.resolve(__dirname, 'examples/DevConsole'),
        file: 'DevConsole.js'
    },
    react: {
        path: path.resolve(__dirname, 'examples/React'),
        file: 'React.jsx'
    },
    canvas: {
        path: path.resolve(__dirname, 'examples/Canvas'),
        file: 'Canvas.js'
    }
};

const libPath = path.resolve(__dirname, 'src');
const publicPath = path.resolve(__dirname, 'public');

export default function (env = {}) {
    const entry = entries[env.example];

    return {
        devServer: {
            historyApiFallback: true,
            hot: true,
            port,
            contentBase: entry.path
        },

        devtool: '#source-map',

        entry: path.resolve(entry.path, entry.file),

        output: {
            path: binPath,
            filename: 'bundle.js'
        },

        resolve: {
            extensions: ['.js', '.jsx'],
            modules: ['node_modules']
        },

        module: {
            rules: [{
                test: /\.js[x]?$/,
                loader: 'babel-loader',
                include: [entry.path, libPath]
            }, {
                test: /\.mstyl$/,
                loaders: [{
                    loader: 'style-loader',
                    query: { sourceMap: true }
                }, {
                    loader: 'css-loader',
                    query: {
                        modules: true,
                        importLoaders: 1,
                        localIdentName: '[path]___[name]__[local]___[hash:base64:5]'
                    }
                }, {
                    loader: 'postcss-loader'
                }, {
                    loader: 'stylus-loader'
                }]
            }, {
                test: /\.styl$/,
                loaders: [{
                    loader: 'style-loader',
                    query: { sourceMap: true }
                }, {
                    loader: 'css-loader'
                }, {
                    loader: 'postcss-loader'
                }, {
                    loader: 'stylus-loader'
                }]
            }, {
                test: /\.png$/,
                loader: 'url-loader',
                options: {
                    limit: '10000',
                    mimetype: 'application/png'
                }
            }, {
                test: /\.woff[2]?$/,
                loader: 'url-loader',
                options: {
                    limit: '10000',
                    mimetype: 'application/font-woff'
                }
            }, {
                test: /\.ttf$/,
                loader: 'url-loader',
                options: {
                    limit: '10000',
                    mimetype: 'application/octet-stream'
                }
            }, {
                test: /\.eot$/,
                loader: 'file-loader'
            }, {
                test: /\.svg$/,
                loader: 'url-loader',
                options: {
                    limit: '10000',
                    mimetype: 'image/svg+xml'
                }
            }]
        },

        plugins: [
            new DefinePlugin({
                'process.env': {
                    NODE_ENV: JSON.stringify(process.env.NODE_ENV)
                }
            }),

            new WriteFilePlugin(),

            new CleanWebpackPlugin([bundleFolder], {
                root: __dirname,
                verbose: true,
                dry: false
            }),

            new CopyWebpackPlugin([{ from: publicPath }]),

            new LoaderOptionsPlugin({
                options: {
                    postcss: [
                        PostcssSmartImport({}),
                        Autoprefixer({})
                    ]
                }
            })
        ]
    };
}
