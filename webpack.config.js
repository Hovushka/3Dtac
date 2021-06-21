const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
    entry: {
        main: path.resolve(__dirname, './src/main.js'),
    },

    output: {
        path: path.resolve(__dirname, './build'),
        filename: '[name].bundle.js',
    },

    devServer: {
        historyApiFallback: true,
        contentBase: path.resolve(__dirname, './debug'),
        open: false,
        compress: true,
        hot: true,
        port: 8080,
    },

    plugins: [
        new HtmlWebpackPlugin({
            title: '3D tic-tac-toe',
            template: path.resolve(__dirname, './src/main.html'),
            filename: 'index.html',
            favicon: "./res/favicon.ico"
        }),

        new CleanWebpackPlugin(),

        new webpack.HotModuleReplacementPlugin(),
    ],

    module: {
        rules: [
            // JavaScript
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },
            // Images
            {
                test: /\.(?:ico|gif|png|jpg|jpeg)$/i,
                type: 'asset/resource',
            },
            // Fonts and SVG
            {
                test: /\.(woff(2)?|eot|ttf|otf|svg|)$/,
                type: 'asset/inline',
            },
            // CSS
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },

    mode: 'production',
}
