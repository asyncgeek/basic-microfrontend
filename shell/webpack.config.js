const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    publicPath: "http://localhost:3000/",
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        mfDashboard: "mfDashboard@http://localhost:4200/remoteEntry.js",
        mfCart: "mfCart@http://localhost:3001/remoteEntry.js",
        mfTopbar: "mfTopbar@http://localhost:3002/remoteEntry.js",
      },
      shared: {
        react: { singleton: true, strictVersion: false },
        "react-dom": { singleton: true, strictVersion: false },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
  ],
};
