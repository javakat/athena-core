
class Core {
    static onRequest (payload) {
        if(typeof payload === 'undefined') throw new ParameterCountError('We can\'t do anything without a payload!')
        if(typeof payload !== 'object') throw new TypeError('The payload needs to be an object. (Received: ' + typeof payload + '.)')
        if(typeof payload.tags === 'undefined') throw new TypeError('The payload must contain a tags array. (Received: ' + payload + '.)')
        if(!Array.isArray(payload.tags)) throw new TypeError('The payload\'s tags property must be an array. (Received: ' + payload.tags + '.)')
        if(typeof payload.id === 'undefined') throw new TypeError('The payload must contain a user id snowflake. (Received: ' + payload + '.)')
        if(typeof payload.id !== 'number') throw new TypeError('The payload\'s user id snowflake property must be a number. (Received: ' + typeof payload.id + '.)')

        try {
            getValidImageURL(payload.tags, payload.id).then((url) => {
                let u = url
                try {
                    save().then(() => {
                        return u
                    })
                }
                catch (e) {
                    return 'Sorry, sorry, I\'m sorry...I\'ve failed. Someone should probably let @milieu know.'
                }
            })
        }
        catch (e) {
            return 'Sorry, sorry, I\'m sorry...It seems there\'s nothing new to show. I\'ll get on that.'
        }

    }  
    static getValidImageURL (tags, id) {
        
    }
    static save () {

    }
}