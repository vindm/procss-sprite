module.exports = [ {
    file_paths : '**',
    config : {
        plugins : [ {
            plugin : '../..',
            config : {
                default : { name : 'multifile_sprite' }
            }
        } ]
    }
} ];
