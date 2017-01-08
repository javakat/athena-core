
const ParameterCountError = require('./errors').ParameterCountError,
      NoContentError = require('./errors').NoContentError,
      Tumblr = require ('tumblr.js'),
      TokenManager = require('./token-manager')

var Models = require('../models')

class Core {
    static onRequest (payload) {
        if(typeof payload === 'undefined') throw new ParameterCountError('We can\'t do anything without a payload!')
        if(typeof payload !== 'object') throw new TypeError('The payload needs to be an object. (Received: ' + typeof payload + '.)')
        if(typeof payload.tags === 'undefined') throw new TypeError('The payload must contain a tags array. (Received: ' + payload + '.)')
        if(!Array.isArray(payload.tags)) throw new TypeError('The payload\'s tags property must be an array. (Received: ' + payload.tags + '.)')
        if(typeof payload.id === 'undefined') throw new TypeError('The payload must contain a user id snowflake. (Received: ' + payload + '.)')
        if(typeof payload.id !== 'number') throw new TypeError('The payload\'s user id snowflake property must be a number. (Received: ' + typeof payload.id + '.)')



        return this.getValidImageURL(payload.tags, payload.id)
            .then(
                (post) => {
                    let url = post.url // actually, do I need this? can I just return url?
                    return this.save(payload.id, post.id).then(
                        () => {
                            return url
                        }
                    ).catch(
                        (err) => {
                            throw err 
                        }
                    )
                }
            ).catch(
                (err) => {
                    return 'Sorry, sorry, I\'m sorry...I\'ve failed. Someone should probably let @milieu#5270 know.\nError:\n' + err + '\n'
                }
            )

    }  
    static getValidImageURL (tags, id) {
        if(typeof tags === 'undefined') throw new ParameterCountError('We must receive an array of tags, but received nothing.')
        if(tags.length === 0) throw new ParameterCountError('The tags array must not be empty, but it was.')
        if(!Array.isArray(tags)) throw new TypeError('The tags array must be a proper javascript array.')
        if(typeof id === 'undefined') throw new ParameterCountError('We must receive a user id snowflake, but received nothing.')
        if(typeof id !== 'number') throw new TypeError('The user id snowflake must be a number. (Received: ' + typeof id + ')')
        if(id <= 0) throw new TypeError('The user id snowflake will always be a positive integer. (Received:' + id + ')')

        return new Promise((resolve, reject) => { 
            // ask database for post that matches all tags
            // that no user with ID id has seen
            
            Models.Post.findAll(
                { 
                    include: [
                        { 
                            model: Models.Tag, 
                            attributes: ['name'], 
                            where: { 
                                name: { 
                                    $in: tags
                                } 
                            } 
                        }
                    ], 
                    group: ['Post.id'], 
                    having: ['COUNT(?) >= ?', 'Tag.name', tags.length] 
                })
                .then((posts) => { 
                    if(typeof (posts[0].dataValues) === 'undefined' )
                        reject(posts[0])
                    resolve(posts[0].dataValues)
                })
                .catch(reject)
        })
    }
    static save (id, post) {
        
        return Models.sequelize.transaction((t) => {
            return Models.View.create(
                {
                    UserId: id,
                    PostId: post.id
                }
            )
        })
    }
    static fetchFromTumblr() {
        
        let tm = new TokenManager('./tokens')
        tm.parseTokens().then(() => {
            let tumblr = Tumblr.createClient({
                consumer_key: tm.tokens['tumblr'],
                returnPromises: true
            })

            let posts = [],
                tags = []
            
            tumblr.taggedPosts('overwatch')
                .then((postsFromTumblr) => {
                    // filter out all non-image posts
                    posts = postsFromTumblr.filter((e, i) => {
                        return e.type === 'photo'
                    })

                    // create tags as tag objects that
                    // the Tag model can pass to the DB,
                    // and group them into an array for
                    // bulkCreate()
                    for(let p in posts) {

                        let post = posts[p]
                        posts[p] = { id: post.id, url: post.post_url, tags: post.tags }

                        for(let t in post.tags) {
                            let tag = post.tags[t]
                            tag = { name: tag.toLowerCase() } 
                            posts[p].tags[t] = tag
                            tags.push(tag)
                        }
                    }

                    return Models.Tag.bulkCreate(tags, { fields: ['name'], ignoreDuplicates: true })
                        .then((tagModels) => {

                            for (let post of posts)
                                Models.Post.create(post)
                                    .then((postModel) => {

                                        let tagNames = []
                                        for(let tag of post.tags) {
                                            tagNames.push(tag.name)
                                        }

                                        Models.Tag.findAll({ 
                                            where: {
                                                name: {
                                                    in: tagNames
                                                }
                                            }
                                        }).then((tagModels) => {
                                            postModel.setTags(tagModels, {
                                                include: [ {
                                                    model: Models.Tag
                                                } ]
                                            }).catch((err) => { console.log ('Setting the tags didn\'t work, somehow...'); console.log(err) })
                                        })
                                    })
                                    .catch((err) => { throw err })
                        }, (err) => { 
                            console.log('Bulk tag creation failed.')
                            console.log(err) 
                        }).catch((err) => { 
                            throw err
                        })


                }, (err) => { throw err })

            return posts

        }).catch((err) => {
            console.error('Something went wrong fetching from Tumblr. Stack trace: ')
            console.error(err)
        })
    }
}

module.exports = { Core, Models }
